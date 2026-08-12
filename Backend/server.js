require('dotenv').config();
const dns = require('dns');
// Render's network breaks the TLS handshake to MongoDB Atlas when Node
// resolves Atlas hostnames to IPv6 first (default since Node 18). Forcing
// IPv4 first avoids the "tlsv1 alert internal error" / ReplicaSetNoPrimary
// connection failures seen on Render.
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const multer = require('multer');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { buildOrderStatusEmail } = require('./orderEmailTemplate');
const { drawInvoice } = require('./invoiceTemplate');
const { getProductType, priceWithVariants } = require('./productTypes');

const SITE_URL = process.env.SITE_URL || 'https://immortal0p.github.io/Brush-Production';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Returns { sent: true } on success, or { sent: false, reason } on failure -
// never throws, so callers can report accurate status back to the admin
// instead of assuming the email went out.
async function sendOrderEmail(order, forceSend = false) {
  if (!order || !order.customer) return { sent: false, reason: 'Order has no customer details' };
  const toEmail = order.customer.email || order.customer.id;
  if (!toEmail || !toEmail.includes('@')) return { sent: false, reason: 'Customer has no valid email address' };

  const { subject, html, text } = buildOrderStatusEmail(order, SITE_URL);
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Brush Posters" <noreply@brushposters.com>',
    to: toEmail,
    subject,
    html,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent for order ${order.orderId || order._id} to ${toEmail}`);
    return { sent: true, to: toEmail };
  } catch (error) {
    console.error(`Failed to send email for order ${order.orderId || order._id}:`, error);
    return { sent: false, reason: error.message };
  }
}

// Sequential, human-readable invoice numbers (INV-<year>-<seq>), distinct
// from the order ID. Unlike the order ID, this is NEVER used to look up an
// order - it's a display-only field - because a sequential number is
// trivially enumerable and must not double as an access credential.
async function getNextInvoiceNumber() {
  const year = new Date().getFullYear();
  const counter = await countersRef.findOneAndUpdate(
    { _id: `invoice-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const seq = counter.seq ?? counter.value?.seq; // tolerate driver version differences in return shape
  return `INV-${year}-${String(seq).padStart(6, '0')}`;
}

const app = express();
// Render sits in front of this app as a reverse proxy, so the real client
// IP arrives via X-Forwarded-For rather than the socket address. Without
// this, express-rate-limit either keys every request off Render's proxy IP
// (making the limiters useless - one shared bucket for all users) or, on
// v8+, refuses the request outright when it sees a forwarded header it
// wasn't told to trust. `1` trusts exactly one hop, matching Render's setup.
app.set('trust proxy', 1);
let activeAdminToken = null; // Legacy single token
const activeAdminTokens = new Map(); // token -> { username, role, expiresAt }
const activeUserTokens = new Map(); // token -> { userId, expiresAt }
const passwordResetTokens = new Map(); // token -> { userId, expiresAt }
const port = process.env.PORT || 5500;

// Sessions previously never expired - a token stayed valid until the
// process restarted, so a leaked admin or user token was a standing
// compromise with no time limit. Admin gets the shorter window since
// that's the higher-privilege account.
const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours
const USER_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// MongoDB interprets a query field set to an object (e.g. `{"$ne": null}`)
// as an operator, not a literal match - so any field that flows from
// req.body into a findOne()/query filter must be confirmed to be an
// actual string first, or a crafted JSON body could bypass the intended
// lookup entirely (classic NoSQL injection).
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

// Password hashing: bcrypt for anything written from here on, with
// backward-compatible verification against the plain-SHA256 hashes that
// were stored before this change. SHA256 is a fast hash - designed for
// speed, which is exactly wrong for passwords, since it makes brute-forcing
// a leaked hash cheap. bcrypt is deliberately slow and salted per-hash.
//
// There's no migration script - existing rows still hold sha256 hex
// digests. hashPassword() is for every NEW hash going forward.
// verifyPassword() checks bcrypt hashes directly, but falls back to the
// legacy sha256 comparison when the stored hash isn't a bcrypt hash, and
// reports that back via needsRehash so the caller can transparently
// upgrade the stored hash to bcrypt on that successful login - no forced
// password reset, no downtime, existing users are migrated lazily as they
// log in.
const isBcryptHash = (hash) => typeof hash === 'string' && /^\$2[aby]\$/.test(hash);
const legacySha256 = (password) => crypto.createHash('sha256').update(password).digest('hex');

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, storedHash) {
  if (isBcryptHash(storedHash)) {
    return { valid: await bcrypt.compare(password, storedHash), needsRehash: false };
  }
  return { valid: legacySha256(password) === storedHash, needsRehash: true };
}

function issueUserToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  activeUserTokens.set(token, { userId, expiresAt: Date.now() + USER_SESSION_MS });
  return token;
}

// Middleware for customer-facing routes that must be scoped to the logged-in account.
const requireUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in.' });
  }
  const token = authHeader.split(' ')[1];
  const session = activeUserTokens.get(token);
  if (!session || session.expiresAt < Date.now()) {
    activeUserTokens.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
  req.userId = session.userId;
  next();
};

// Use after requireUser on routes keyed by :id - ensures the logged-in
// account can only ever act on its own data, never someone else's by
// swapping the :id in the URL.
const requireOwnUser = (req, res, next) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// CSP built from the site's actual external resource usage (checked every
// public/*.html for src=/href=/fetch() targets) rather than a generic
// template - a mismatched CSP just breaks the page silently, so it's only
// worth shipping if it matches what's really loaded.
//
// 'unsafe-inline' stays in script-src and style-src: this is a vanilla-JS
// site with real inline <script> blocks and inline style= attributes on
// every page, not a bundled app. Dropping it would break the whole site,
// not just tighten it - the other directives (frame-ancestors, object-src,
// base-uri, the explicit external allowlist) still meaningfully shrink the
// attack surface without that risk.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // checkout.razorpay.com's own SDK loads a secondary risk-detection
      // bundle from cdn.razorpay.com (a different subdomain) at runtime,
      // and its payment iframe/API calls go to api.razorpay.com — all
      // three confirmed via a live checkout run that surfaced each one as
      // a separate CSP violation (same shape of gap as the Font Awesome
      // kit fix above: a loader script pulling from a sibling domain the
      // allowlist didn't cover).
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com', 'https://cdn.razorpay.com', 'https://cdnjs.cloudflare.com', 'https://kit.fontawesome.com', 'https://unpkg.com'],
      // Separate from script-src: governs inline onclick="" etc attributes,
      // which admin.html and index.html both use extensively. Helmet
      // defaults this to 'none' independently of script-src's own
      // 'unsafe-inline' - confirmed by actually running this config
      // through a request before shipping it, not just assuming.
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://ka-f.fontawesome.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'https://kit.fontawesome.com', 'https://ka-f.fontawesome.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://storage.googleapis.com'],
      // The kit.fontawesome.com loader script fetches its actual CSS/font
      // manifest from ka-f.fontawesome.com at runtime (confirmed via a live
      // console check — every fetch to it was being silently blocked here,
      // which is why every fa-* icon on the site was rendering as an empty
      // circle/box: the glyph font never loaded, not a markup bug).
      connectSrc: ["'self'", 'https://brush-production.onrender.com', 'https://checkout.razorpay.com', 'https://api.razorpay.com', 'https://lumberjack.razorpay.com', 'https://kit.fontawesome.com', 'https://ka-f.fontawesome.com'],
      frameSrc: ['https://checkout.razorpay.com', 'https://api.razorpay.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  // Both left off rather than guessed at: Razorpay's checkout can involve
  // a popup/redirect flow, and helmet's default Cross-Origin-Opener-Policy
  // (same-origin) severs window.opener between this page and that popup,
  // which would silently break payment completion if Razorpay's flow
  // depends on it. Same caution for COEP and any third-party embed. Not
  // worth the risk of a payment-flow regression I can't test live to
  // verify - the CSP above is doing the real work in this phase.
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
}));
// Was app.use(cors()) - reflected any Access-Control-Allow-Origin. Auth
// here is Bearer-token based (no cookies), so this was never classic
// CSRF-exploitable, but an open CORS policy still lets any website script
// requests against this API on a visitor's behalf (scraping at scale,
// riding a visitor's copy-pasted token if one ever leaked into a script,
// etc.) with no way to tell that traffic apart from the real frontend.
// Locked to the actual deployed origin plus local dev.
const ALLOWED_ORIGINS = [
  'https://immortal0p.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];
app.use(cors({
  origin(origin, callback) {
    // No Origin header at all (curl, server-to-server, same-origin) - allow.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Defense-in-depth on top of the unguessable order ID itself: caps how many
// order/invoice lookups a single IP can attempt, so even a leaked or
// partially-guessed ID can't be brute-forced at scale.
const orderLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order lookups from this device. Please try again later.' }
});

// Caps login/signup/password-reset attempts per IP so credentials can't be
// brute-forced or credential-stuffed at scale. Applies to both customer and
// admin auth - a compromised admin account is a much bigger blast radius
// than a customer one, so it gets the same limiter, not a looser one.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this device. Please try again later.' }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET'
});

// Setup multer for image uploads (Memory storage for Cloud deployment)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Review photos are submitted by unauthenticated shoppers, unlike the
// admin-gated product image upload above — cap size and restrict to
// images so the endpoint can't be used to push arbitrary large files
// into Firebase Storage.
const uploadReviewPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

// ==========================================
// FIREBASE STORAGE (images only — the DB itself lives in MongoDB now)
// ==========================================
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // If Render converts \n to actual newlines, JSON.parse will fail. We need to re-escape them.
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    // Replace actual newline characters with \n string, but don't double escape if already escaped
    const sanitized = raw.replace(/\r?\n/g, '\\n');
    try {
      serviceAccount = JSON.parse(sanitized);
    } catch (e) {
      serviceAccount = JSON.parse(raw);
    }
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", err.message);
  }
}

if (!serviceAccount) {
  // Try local file, or Render Secret File path
  const pathsToTry = [
    path.join(__dirname, 'serviceAccountKey.json'),
    '/etc/secrets/serviceAccountKey.json'
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      serviceAccount = require(p);
      break;
    }
  }
}

let bucket = null;
if (serviceAccount) {
  const projectId = serviceAccount.project_id || 'brush-db-6a308';
  const storageBucket = `${projectId}.appspot.com`;
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: storageBucket
  });
  bucket = getStorage().bucket();
  console.log('✅ Connected to Firebase Storage (image uploads)');
} else {
  console.warn('⚠️  No Firebase credentials found — product image uploads will be disabled.');
}

// ==========================================
// MONGODB INITIALIZATION
// ==========================================
if (!process.env.MONGODB_URI) {
  console.error("❌ FATAL ERROR: MONGODB_URI environment variable is not set.");
  process.exit(1);
}

const mongoClient = new MongoClient(process.env.MONGODB_URI);

let db, productsRef, ordersRef, usersRef, adminsRef, adminLogsRef, countersRef;

// Strips Mongo's internal _id before a document goes out over the API,
// so response shapes stay identical to what the frontend already expects.
function stripId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}


// ==========================================
// API ENDPOINTS
// ==========================================

// ==========================================
// AUTH & USER ENDPOINTS
// ==========================================

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { id, password, name, phone, address } = req.body;
    if (!isNonEmptyString(id) || !isNonEmptyString(password)) return res.status(400).json({ error: 'ID and password required' });

    const existing = await usersRef.findOne({ _id: id });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hash = await hashPassword(password);

    const newUser = {
      _id: id,
      id,
      passwordHash: hash,
      name: name || '',
      phone: phone || '',
      address: address || '',
      createdAt: new Date()
    };

    await usersRef.insertOne(newUser);
    const token = issueUserToken(id);
    res.json({ success: true, token, userId: id, name, phone, address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!isNonEmptyString(id) || !isNonEmptyString(password)) return res.status(400).json({ error: 'ID and password required' });

    const user = await usersRef.findOne({ _id: id });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (needsRehash) {
      await usersRef.updateOne({ _id: id }, { $set: { passwordHash: await hashPassword(password) } });
    }

    const token = issueUserToken(id);
    res.json({ success: true, token, userId: id, name: user.name, phone: user.phone, address: user.address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    activeUserTokens.delete(authHeader.split(' ')[1]);
  }
  res.json({ success: true });
});

// Step 1 of self-service password reset: never reveals whether an account
// exists (same response either way). Only emails a link when the account's
// id is an email address - phone-only accounts have no address to send to.
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { id } = req.body;
    if (!isNonEmptyString(id)) return res.status(400).json({ error: 'ID required' });

    const genericResponse = { success: true, message: 'If an account exists for that ID and has an email on file, a reset link has been sent.' };

    const user = await usersRef.findOne({ _id: id });
    if (user && id.includes('@')) {
      const token = crypto.randomBytes(24).toString('hex');
      passwordResetTokens.set(token, { userId: id, expiresAt: Date.now() + 30 * 60 * 1000 });
      const resetUrl = `${SITE_URL.replace(/\/$/, '')}/reset-password.html?token=${token}`;
      transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Brush Posters" <noreply@brushposters.com>',
        to: id,
        subject: 'Reset your Brush password',
        html: `<p>Hi${user.name ? ' ' + user.name : ''},</p><p>Click below to reset your Brush account password. This link expires in 30 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
        text: `Reset your Brush account password: ${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`
      }).catch(err => console.error('Failed to send password reset email:', err));
    }
    res.json(genericResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Step 2: the actual reset, gated on the emailed token rather than a
// caller-supplied id, so knowing someone's login id is no longer enough to
// take over their account.
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Reset token and new password required' });

    const entry = passwordResetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    await usersRef.updateOne({ _id: entry.userId }, { $set: { passwordHash: await hashPassword(newPassword) } });
    passwordResetTokens.delete(token);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password from within the account (requires a live session AND the
// current password) - distinct from the forgot-password flow above.
app.post('/api/auth/change-password', requireUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });

    const user = await usersRef.findOne({ _id: req.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { valid } = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      // 400, not 401: the session itself (Bearer token, checked by requireUser
      // above) is valid - only the current-password check failed. Keeping 401
      // reserved exclusively for "your session is invalid" lets the frontend
      // treat any 401 as an unambiguous signal to log the user out.
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    await usersRef.updateOne({ _id: req.userId }, { $set: { passwordHash: await hashPassword(newPassword) } });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.get('/api/auth/profile/:id', requireUser, requireOwnUser, async (req, res) => {
  try {
    const user = await usersRef.findOne({ _id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { passwordHash, ...safeUser } = stripId(user);
    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/auth/profile/:id', requireUser, requireOwnUser, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await usersRef.updateOne({ _id: req.params.id }, {
      $set: {
        name: name || '',
        phone: phone || '',
        address: address || '',
        updatedAt: new Date()
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/orders/user/:id', requireUser, requireOwnUser, async (req, res) => {
  try {
    const docs = await ordersRef.find({ userId: req.params.id }).toArray();
    const orders = docs.map(d => ({ id: d._id, ...stripId(d) }));
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const docs = await productsRef.find().sort({ orderFrequency: -1, id: -1 }).toArray();
    res.json(docs.map(stripId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await productsRef.findOne({ id: parseInt(req.params.id) });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const safeProduct = stripId(product);
    safeProduct.reviews = safeProduct.reviews || [];
    res.json(safeProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products/:id/reviews', uploadReviewPhoto.single('photo'), async (req, res) => {
  try {
    const { user, rating, comment } = req.body;
    if (!user || !rating || !comment) return res.status(400).json({ error: 'Missing review fields' });

    const productId = parseInt(req.params.id);
    const product = await productsRef.findOne({ id: productId });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let photoUrl = '';
    if (req.file) {
      if (!bucket) {
        return res.status(503).json({ error: 'Photo uploads are unavailable — Firebase Storage is not configured.' });
      }
      const ext = path.extname(req.file.originalname) || '.jpg';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `reviews/review-${uniqueSuffix}${ext}`;

      const fileUpload = bucket.file(filename);
      await fileUpload.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype }
      });
      await fileUpload.makePublic();
      photoUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    }

    const newReview = {
      user,
      rating: parseInt(rating),
      comment,
      photo: photoUrl,
      date: new Date().toISOString()
    };

    await productsRef.updateOne({ id: productId }, { $push: { reviews: newReview } });

    res.status(201).json(newReview);
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

app.get('/api/config/razorpay', (req, res) => {
  res.json({ key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID' });
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: "rcpt_" + Date.now()
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    // Return a mock order if keys are invalid for demo purposes
    res.json({ id: 'order_mock_' + Date.now(), amount: req.body.amount * 100, currency: 'INR' });
  }
});

app.post('/api/orders', async (req, res) => {
  const session = mongoClient.startSession();
  try {
    const { customer, items, paymentMethod, razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

    // Verify Payment Signature if online payment
    if ((paymentMethod === 'upi' || paymentMethod === 'card') && razorpay_payment_id && !razorpay_order_id.startsWith('order_mock_')) {
      const key_secret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET';
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', key_secret).update(body.toString()).digest('hex');
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    }

    // Validation
    if (!customer || !customer.name || !customer.email || !customer.phone || !customer.address || !customer.city || !customer.state || !customer.pincode) {
      return res.status(400).json({ error: 'Missing required customer details' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    if (!['cod', 'upi', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    let subtotal = 0;
    const enrichedItems = [];

    // Process items against MongoDB products
    for (const item of items) {
      const product = await productsRef.findOne({ id: item.productId });
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
      }

      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ error: `Invalid quantity for product ${item.productId}` });
      }

      const currentStock = product.stockQuantity !== undefined ? product.stockQuantity : 0;
      if (currentStock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${product.name}. Only ${currentStock} left.` });
      }

      // Calculate dynamic price server-side from the product's own type
      // (poster/plate/wallpaper) — never trusts a client-submitted price.
      // Accepts the new `variants` object as well as the flat `size`/`gsm`
      // shape older cached frontend JS (any browser tab that loaded the
      // site before this deploy) still sends, so neither shape silently
      // falls back to base pricing mid-rollout.
      const productType = product.productType || getProductType(product.category);
      const submittedVariants = item.variants || (item.size || item.gsm ? { size: item.size, gsm: item.gsm } : undefined);
      const { price: rawPrice, resolvedVariants } = priceWithVariants(product.price, productType, submittedVariants);
      const finalPrice = Math.max(10, rawPrice);

      const itemSubtotal = finalPrice * item.quantity;
      subtotal += itemSubtotal;

      enrichedItems.push({
        productId: product.id,
        name: product.name,
        image: product.image,
        price: finalPrice,
        originalBasePrice: product.price,
        productType,
        variants: resolvedVariants,
        quantity: item.quantity,
        subtotal: itemSubtotal
      });
    }

    // Calculations
    const shipping = subtotal > 500 ? 0 : 49;
    const discount = subtotal > 1000 ? subtotal * 0.1 : 0;
    const total = subtotal + shipping - discount;

    // Order lookup (order-confirmation page, invoice, status emails) is
    // unauthenticated by design - guest checkout has no account to check
    // ownership against, so the order ID itself is the access credential,
    // same as Amazon/Flipkart guest tracking links. It must therefore be
    // unguessable, not just unique - crypto-random, not a 4-digit counter.
    const orderId = 'ORD-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const invoiceNumber = await getNextInvoiceNumber();
    const now = new Date();
    const estimatedDelivery = new Date(now.setDate(now.getDate() + 5 + Math.floor(Math.random() * 3))); // 5-7 days

    const order = {
      _id: orderId,
      id: orderId,
      orderId: orderId,
      invoiceNumber,
      userId: userId || null,
      customer,
      items: enrichedItems,
      paymentMethod,
      subtotal,
      shipping,
      discount,
      total,
      status: 'confirmed',
      estimatedDelivery: estimatedDelivery.toISOString(),
      createdAt: new Date()
    };

    // Save order + deduct stock atomically
    await session.withTransaction(async () => {
      await ordersRef.insertOne(order, { session });
      for (const item of enrichedItems) {
        await productsRef.updateOne(
          { id: item.productId },
          { $inc: { stockQuantity: -item.quantity, orderFrequency: item.quantity } },
          { session }
        );
      }
    });

    // Convert timestamp back for the immediate JSON response
    const responseOrder = stripId(order);
    responseOrder.createdAt = order.createdAt.toISOString();

    res.status(201).json({ order: responseOrder });

    // Fire-and-forget: don't make the customer wait on an SMTP round trip
    // to see their order confirmation page.
    sendOrderEmail(order);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    await session.endSession();
  }
});

app.get('/api/orders/:orderId', orderLookupLimiter, async (req, res) => {
  try {
    const order = await ordersRef.findOne({ _id: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const safeOrder = stripId(order);
    if (safeOrder.createdAt instanceof Date) {
      safeOrder.createdAt = safeOrder.createdAt.toISOString();
    }

    res.json({ order: safeOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/orders/:orderId/cancel', async (req, res) => {
  try {
    const order = await ordersRef.findOne({ _id: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'confirmed') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    await ordersRef.updateOne({ _id: req.params.orderId }, { $set: { status: 'cancelled' } });

    const safeOrder = stripId(order);
    safeOrder.status = 'cancelled';
    if (safeOrder.createdAt instanceof Date) {
      safeOrder.createdAt = safeOrder.createdAt.toISOString();
    }

    res.json({ message: 'Order cancelled successfully', order: safeOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

app.get('/api/orders/:orderId/invoice', orderLookupLimiter, async (req, res) => {
  try {
    const order = await ordersRef.findOne({ _id: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const pdfDoc = new PDFDocument({ size: 'A4', margin: 50 });

    const filename = `invoice-${order.invoiceNumber || order.orderId}.pdf`;
    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');

    pdfDoc.pipe(res);
    drawInvoice(pdfDoc, order);
    pdfDoc.end();
  } catch (error) {
    console.error('Invoice generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  }
});

// --- ADMIN APIs ---

// Admin Login
app.post('/api/admin/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!isNonEmptyString(username) || !isNonEmptyString(password)) return res.status(400).json({ error: 'Username and password required' });

    const adminData = await adminsRef.findOne({ _id: username });
    if (!adminData) return res.status(401).json({ error: 'Invalid credentials' });

    const { valid, needsRehash } = await verifyPassword(password, adminData.passwordHash);

    if (valid) {
      if (needsRehash) {
        await adminsRef.updateOne({ _id: username }, { $set: { passwordHash: await hashPassword(password) } });
      }
      // Generate a simple session token
      const token = crypto.randomBytes(16).toString('hex');
      const role = adminData.role || 'superadmin';
      activeAdminTokens.set(token, { username, role, expiresAt: Date.now() + ADMIN_SESSION_MS });
      res.json({ success: true, token, role, username });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Middleware for admin routes
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Please login again.' });
  }
  const token = authHeader.split(' ')[1];
  const session = activeAdminTokens.get(token);

  if (!session || session.expiresAt < Date.now()) {
    activeAdminTokens.delete(token);
    if (activeAdminToken && token === activeAdminToken) {
      req.adminSession = { username: 'legacy', role: 'superadmin' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please login again.' });
  }

  req.adminSession = session;
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (req.adminSession.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden. Super admin access required.' });
  }
  next();
};

// Admin Logging
const logAdminActivity = async (username, action, details) => {
  try {
    await adminLogsRef.insertOne({
      username,
      action,
      details,
      keep: false,
      timestamp: new Date()
    });
    cleanOldLogs(); // Fire and forget
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

const cleanOldLogs = async () => {
  try {
    const timeLimit = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago
    await adminLogsRef.deleteMany({ keep: false, timestamp: { $lt: timeLimit } });
  } catch (error) {
    console.error('Failed to clean old logs:', error);
  }
};

// Get Admin Logs
app.get('/api/admin/logs', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const docs = await adminLogsRef.find().sort({ timestamp: -1 }).limit(200).toArray();
    const logs = docs.map(doc => {
      const data = stripId(doc);
      if (data.timestamp instanceof Date) {
        data.timestamp = data.timestamp.toISOString();
      }
      return { id: doc._id.toString(), ...data };
    });
    res.json(logs);
  } catch (error) {
    console.error('Fetch logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Toggle Keep Log
app.patch('/api/admin/logs/:id/keep', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { keep } = req.body;
    await adminLogsRef.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { keep: Boolean(keep) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update log' });
  }
});

// Get all orders
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const docs = await ordersRef.find().sort({ createdAt: -1 }).toArray();
    const orders = docs.map(doc => {
      const data = stripId(doc);
      if (data.createdAt instanceof Date) {
        data.createdAt = data.createdAt.toISOString();
      }
      return data;
    });
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update product
app.patch('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const { name, price, badge, stockQuantity, category, keywords, sku, showInBestsellers, showInNewArrivals, showInGrossing } = req.body;

    // Role based enforcement
    if (req.adminSession.role === 'watcher') {
      return res.status(403).json({ error: 'Watcher accounts have view-only access.' });
    }

    if (req.adminSession.role === 'stocker') {
       // Stocker can only update stockQuantity
       if (name !== undefined || price !== undefined || badge !== undefined || category !== undefined || keywords !== undefined ||
           showInBestsellers !== undefined || showInNewArrivals !== undefined || showInGrossing !== undefined) {
          return res.status(403).json({ error: 'Stocker can only modify inventory quantity.' });
       }
    }

    // Homepage placement flags are superadmin-only
    if (req.adminSession.role !== 'superadmin' &&
        (showInBestsellers !== undefined || showInNewArrivals !== undefined || showInGrossing !== undefined)) {
      return res.status(403).json({ error: 'Only superadmin can control homepage placement.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = Number(price);
    if (badge !== undefined) updateData.badge = badge;
    if (stockQuantity !== undefined) updateData.stockQuantity = Number(stockQuantity);
    if (category !== undefined) {
      updateData.category = category;
      updateData.productType = getProductType(category);
    }
    if (keywords !== undefined) updateData.keywords = keywords;
    if (sku !== undefined) updateData.sku = sku;
    if (showInBestsellers !== undefined) updateData.showInBestsellers = Boolean(showInBestsellers);
    if (showInNewArrivals !== undefined) updateData.showInNewArrivals = Boolean(showInNewArrivals);
    if (showInGrossing !== undefined) updateData.showInGrossing = Boolean(showInGrossing);

    const productId = parseInt(req.params.id);
    const oldData = await productsRef.findOne({ id: productId });
    if (!oldData) return res.status(404).json({ error: 'Product not found' });

    const changes = [];
    if (name !== undefined && oldData.name !== name) changes.push(`name to "${name}"`);
    if (price !== undefined && oldData.price !== Number(price)) changes.push(`price to ${price}`);
    if (stockQuantity !== undefined && oldData.stockQuantity !== Number(stockQuantity)) changes.push(`stock to ${stockQuantity}`);
    if (badge !== undefined && oldData.badge !== badge) changes.push(`badge to "${badge}"`);
    if (category !== undefined && oldData.category !== category) changes.push(`cat to "${category}"`);
    if (keywords !== undefined && oldData.keywords !== keywords) changes.push(`keywords to "${keywords}"`);
    if (sku !== undefined && oldData.sku !== sku) changes.push(`sku to "${sku}"`);
    if (showInBestsellers !== undefined && oldData.showInBestsellers !== Boolean(showInBestsellers)) changes.push(`bestsellers to ${showInBestsellers}`);
    if (showInNewArrivals !== undefined && oldData.showInNewArrivals !== Boolean(showInNewArrivals)) changes.push(`new arrivals to ${showInNewArrivals}`);
    if (showInGrossing !== undefined && oldData.showInGrossing !== Boolean(showInGrossing)) changes.push(`grossing to ${showInGrossing}`);
    const changesStr = changes.length > 0 ? changes.join(', ') : 'no changes';

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: 'No changes provided' });
    }

    await productsRef.updateOne({ id: productId }, { $set: updateData });
    logAdminActivity(req.adminSession.username, 'Update Product', `Updated product ID: ${req.params.id} (${changesStr})`);
    res.json({ success: true });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    if (req.adminSession.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can delete products.' });
    }

    const productId = parseInt(req.params.id);
    const result = await productsRef.deleteOne({ id: productId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Product not found' });

    logAdminActivity(req.adminSession.username, 'Delete Product', `Deleted product ID: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.post('/api/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (req.adminSession.role === 'watcher') {
      return res.status(403).json({ error: 'Watcher accounts have view-only access.' });
    }

    const { name, category, price, originalPrice, badge, description, stockQuantity, keywords, sku } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Auto-generate numeric ID based on highest existing ID
    const [top] = await productsRef.find().sort({ id: -1 }).limit(1).toArray();
    const newId = (top ? top.id : 0) + 1;

    let imageUrl = '';
    if (req.file) {
      if (!bucket) {
        return res.status(503).json({ error: 'Image uploads are unavailable — Firebase Storage is not configured.' });
      }
      const ext = path.extname(req.file.originalname) || '.jpg';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `products/prod-${uniqueSuffix}${ext}`;

      const fileUpload = bucket.file(filename);
      await fileUpload.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype }
      });
      // Make it publicly accessible
      await fileUpload.makePublic();
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    }

    const resolvedCategory = category || 'Miscellaneous';
    const newProduct = {
      _id: newId,
      id: newId,
      name,
      category: resolvedCategory,
      productType: getProductType(resolvedCategory),
      price: Number(price),
      originalPrice: Number(originalPrice || price),
      badge: badge || '',
      description: description || '',
      stockQuantity: Number(stockQuantity || 0),
      keywords: keywords || '',
      sku: sku || newId.toString(),
      image: imageUrl,
      showInBestsellers: false,
      showInNewArrivals: false,
      showInGrossing: false,
      createdAt: new Date()
    };

    await productsRef.insertOne(newProduct);

    logAdminActivity(req.adminSession.username, 'Add Product', `Added product ID: ${newId} (${name})`);

    res.json({ success: true, product: stripId(newProduct) });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update order status
app.patch('/api/orders/:orderId/status', requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await ordersRef.findOne({ _id: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const oldStatus = order.status;
    await ordersRef.updateOne({ _id: req.params.orderId }, { $set: { status } });
    order.status = status;
    const emailResult = await sendOrderEmail(order);
    logAdminActivity(req.adminSession.username, 'Update Order Status', `Changed order ${req.params.orderId} status from ${oldStatus} to ${status}`);
    res.json({
      message: 'Order status updated successfully',
      emailSent: emailResult.sent,
      emailError: emailResult.sent ? undefined : emailResult.reason
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.post('/api/orders/:orderId/send-update', requireAdmin, async (req, res) => {
  try {
    const order = await ordersRef.findOne({ _id: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const emailResult = await sendOrderEmail(order, true);
    if (!emailResult.sent) {
      return res.status(502).json({ error: `Failed to send email: ${emailResult.reason}` });
    }
    res.json({ message: 'Order update email sent successfully', to: emailResult.to });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send order update' });
  }
});



// Catch-all for anything that didn't match an API route or a static file
// above - previously fell through to Express's bare "Cannot GET /..." page,
// an unbranded dead end with no nav and no way back. JSON for API paths
// (so client-side error handling that expects JSON doesn't break), the
// branded page for everything else.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

async function start() {
  await mongoClient.connect();
  db = mongoClient.db();
  productsRef = db.collection('products');
  ordersRef = db.collection('orders');
  usersRef = db.collection('users');
  adminsRef = db.collection('admins');
  adminLogsRef = db.collection('admin_logs');
  countersRef = db.collection('counters');
  console.log('✅ Connected to MongoDB');

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
