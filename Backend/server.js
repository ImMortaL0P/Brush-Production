require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const multer = require('multer');

const app = express();
let activeAdminToken = null; // Legacy single token
const activeAdminTokens = new Map(); // Store tokens and roles in memory
const port = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET'
});

// Setup multer for image uploads (Memory storage for Cloud deployment)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

let db, productsRef, ordersRef, usersRef, adminsRef, adminLogsRef;

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

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { id, password, name, phone, address } = req.body;
    if (!id || !password) return res.status(400).json({ error: 'ID and password required' });

    const existing = await usersRef.findOne({ _id: id });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');

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
    res.json({ success: true, userId: id, name, phone, address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) return res.status(400).json({ error: 'ID and password required' });

    const user = await usersRef.findOne({ _id: id });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');

    if (user.passwordHash !== hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, userId: id, name: user.name, phone: user.phone, address: user.address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { id, newPassword } = req.body;
    if (!id || !newPassword) return res.status(400).json({ error: 'ID and new password required' });

    const user = await usersRef.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await usersRef.updateOne({ _id: id }, { $set: { passwordHash: hash } });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.get('/api/auth/profile/:id', async (req, res) => {
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

app.put('/api/auth/profile/:id', async (req, res) => {
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

app.get('/api/orders/user/:id', async (req, res) => {
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
    const docs = await productsRef.find().sort({ id: 1 }).toArray();
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

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { user, rating, comment } = req.body;
    if (!user || !rating || !comment) return res.status(400).json({ error: 'Missing review fields' });

    const productId = parseInt(req.params.id);
    const product = await productsRef.findOne({ id: productId });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const newReview = {
      user,
      rating: parseInt(rating),
      comment,
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

      // Calculate dynamic price based on variants
      let finalPrice = product.price;

      // Size pricing logic
      if (item.size === 'A3') finalPrice += 50;
      if (item.size === 'A5') finalPrice -= 20; // A4 is base

      // GSM pricing logic
      if (item.gsm === '140') finalPrice += 40; // 80 is base

      // Ensure price doesn't go below reasonable minimum
      if (finalPrice < 10) finalPrice = 10;

      const itemSubtotal = finalPrice * item.quantity;
      subtotal += itemSubtotal;

      enrichedItems.push({
        productId: product.id,
        name: product.name,
        image: product.image,
        price: finalPrice,
        originalBasePrice: product.price,
        size: item.size || 'A4',
        gsm: item.gsm || '80',
        quantity: item.quantity,
        subtotal: itemSubtotal
      });
    }

    // Calculations
    const shipping = subtotal > 500 ? 0 : 49;
    const discount = subtotal > 1000 ? subtotal * 0.1 : 0;
    const total = subtotal + shipping - discount;

    const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const estimatedDelivery = new Date(now.setDate(now.getDate() + 5 + Math.floor(Math.random() * 3))); // 5-7 days

    const order = {
      _id: orderId,
      id: orderId,
      orderId: orderId,
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
          { $inc: { stockQuantity: -item.quantity } },
          { session }
        );
      }
    });

    // Convert timestamp back for the immediate JSON response
    const responseOrder = stripId(order);
    responseOrder.createdAt = order.createdAt.toISOString();

    res.status(201).json({ order: responseOrder });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    await session.endSession();
  }
});

app.get('/api/orders/:orderId', async (req, res) => {
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

app.get('/api/orders/:orderId/invoice', async (req, res) => {
  try {
    const order = await ordersRef.findOne({ _id: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const pdfDoc = new PDFDocument({ size: 'A4', margin: 50 });

    const filename = `invoice-${order.orderId}.pdf`;
    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');

    pdfDoc.pipe(res);

    // Header
    pdfDoc.fontSize(36).font('Helvetica-Bold').fillColor('#2d3748').text('Brush', 50, 50, { continued: true }).fillColor('#dcff80').text('.', { continued: false });
    pdfDoc.fontSize(24).fillColor('#1a202c').text('Invoice', 400, 55, { align: 'right' });

    // From & Invoice Meta
    pdfDoc.fontSize(10).fillColor('#4a5568');
    pdfDoc.text('From:', 50, 110, { continued: true }).font('Helvetica-Bold').text('\nBrush.', { continued: false }).font('Helvetica');
    pdfDoc.text('Suite 1A-204');
    pdfDoc.text('123 Creative Street');
    pdfDoc.text('Patna, Bihar 800001');
    pdfDoc.text('admin@brush.ind.in');

    const metaTop = 110;
    const rightCol = 350;

    pdfDoc.rect(rightCol, metaTop, 200, 100).strokeColor('#cbd5e0').stroke();
    pdfDoc.moveTo(rightCol, metaTop + 20).lineTo(rightCol + 200, metaTop + 20).stroke();
    pdfDoc.moveTo(rightCol, metaTop + 40).lineTo(rightCol + 200, metaTop + 40).stroke();
    pdfDoc.moveTo(rightCol, metaTop + 60).lineTo(rightCol + 200, metaTop + 60).stroke();
    pdfDoc.moveTo(rightCol, metaTop + 80).lineTo(rightCol + 200, metaTop + 80).stroke();
    pdfDoc.moveTo(rightCol + 85, metaTop).lineTo(rightCol + 85, metaTop + 100).stroke();

    pdfDoc.fillColor('#2d3748').font('Helvetica-Bold').text('Invoice Number', rightCol + 5, metaTop + 6);
    pdfDoc.font('Helvetica').text(order.orderId, rightCol + 90, metaTop + 6);

    pdfDoc.font('Helvetica-Bold').text('Order Number', rightCol + 5, metaTop + 26);
    pdfDoc.font('Helvetica').text(order.orderId, rightCol + 90, metaTop + 26);

    const invoiceDate = new Date(order.createdAt instanceof Date ? order.createdAt : (order.createdAt || Date.now()));
    pdfDoc.font('Helvetica-Bold').text('Invoice Date', rightCol + 5, metaTop + 46);
    pdfDoc.font('Helvetica').text(invoiceDate.toLocaleDateString(), rightCol + 90, metaTop + 46);

    pdfDoc.font('Helvetica-Bold').text('Due Date', rightCol + 5, metaTop + 66);
    pdfDoc.font('Helvetica').text(invoiceDate.toLocaleDateString(), rightCol + 90, metaTop + 66);

    pdfDoc.font('Helvetica-Bold').text('Total Due', rightCol + 5, metaTop + 86);
    pdfDoc.font('Helvetica-Bold').text('Rs. ' + order.total.toFixed(2), rightCol + 90, metaTop + 86);

    // To
    pdfDoc.font('Helvetica-Bold').text('To:', 50, 210);
    pdfDoc.font('Helvetica').text(order.customer.name);
    pdfDoc.text(order.customer.address);
    pdfDoc.text(`${order.customer.city}, ${order.customer.state} ${order.customer.pincode}`);
    pdfDoc.text(order.customer.email);

    // Items Table
    const tableTop = 290;

    pdfDoc.rect(50, tableTop, 500, 20).fillAndStroke('#f7fafc', '#cbd5e0');
    pdfDoc.fillColor('#2d3748').font('Helvetica-Bold');
    pdfDoc.text('Qty', 60, tableTop + 5);
    pdfDoc.text('Service/Product', 100, tableTop + 5);
    pdfDoc.text('Rate/Price', 330, tableTop + 5, { width: 70, align: 'right' });
    pdfDoc.text('Adjust', 410, tableTop + 5, { width: 50, align: 'right' });
    pdfDoc.text('Sub Total', 470, tableTop + 5, { width: 70, align: 'right' });

    let y = tableTop + 25;
    pdfDoc.font('Helvetica');

    order.items.forEach(item => {
      pdfDoc.text(item.quantity.toString(), 60, y + 5);
      pdfDoc.font('Helvetica-Bold').text(item.name, 100, y + 5);
      pdfDoc.font('Helvetica').fillColor('#718096').text(`Size: ${item.size} | Paper: ${item.gsm} GSM`, 100, y + 17);
      pdfDoc.fillColor('#2d3748').text('Rs. ' + item.price.toFixed(2), 330, y + 5, { width: 70, align: 'right' });
      pdfDoc.text('0.00%', 410, y + 5, { width: 50, align: 'right' });
      pdfDoc.text('Rs. ' + item.subtotal.toFixed(2), 470, y + 5, { width: 70, align: 'right' });

      pdfDoc.moveTo(50, y + 35).lineTo(550, y + 35).strokeColor('#e2e8f0').stroke();
      y += 35;
    });

    // Totals Table (right aligned, underneath items table)
    const summaryTop = y + 10;
    pdfDoc.rect(330, summaryTop - 5, 220, 65).strokeColor('#cbd5e0').stroke();
    pdfDoc.moveTo(330, summaryTop + 15).lineTo(550, summaryTop + 15).stroke();
    pdfDoc.moveTo(330, summaryTop + 35).lineTo(550, summaryTop + 35).stroke();
    pdfDoc.moveTo(430, summaryTop - 5).lineTo(430, summaryTop + 60).stroke();

    pdfDoc.font('Helvetica').text('Sub Total', 340, summaryTop, { width: 80 });
    pdfDoc.font('Helvetica').text('Rs. ' + order.subtotal.toFixed(2), 440, summaryTop, { width: 100, align: 'right' });

    pdfDoc.font('Helvetica').text('Shipping', 340, summaryTop + 20, { width: 80 });
    pdfDoc.font('Helvetica').text('Rs. ' + order.shipping.toFixed(2), 440, summaryTop + 20, { width: 100, align: 'right' });

    pdfDoc.font('Helvetica-Bold').text('Total', 340, summaryTop + 40, { width: 80 });
    pdfDoc.font('Helvetica-Bold').text('Rs. ' + order.total.toFixed(2), 440, summaryTop + 40, { width: 100, align: 'right' });

    // Watermark "PAID"
    if (order.paymentMethod !== 'cod') {
      pdfDoc.save()
            .translate(280, 400)
            .rotate(-30)
            .fontSize(100)
            .fillColor('#e2e8f0')
            .fillOpacity(0.3)
            .text('PAID', 0, 0, { align: 'center' })
            .restore();
    }

    // Bottom bank details
    pdfDoc.fontSize(10).fillColor('#4a5568').font('Helvetica');
    pdfDoc.text('Brush Bank', 50, summaryTop);
    pdfDoc.text('ACC # 1234 1234');
    pdfDoc.text('IFSC # HDFC0001234');

    // Footer
    pdfDoc.fontSize(9).fillColor('#718096');
    pdfDoc.text('Payment is due within 30 days from date of invoice. Late payment is subject to fees of 5% per month.', 50, 715);
    pdfDoc.text('Thanks for choosing Brush | admin@brush.ind.in', 50, 730);
    pdfDoc.text('Page 1/1', 50, 745);

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
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const adminData = await adminsRef.findOne({ _id: username });
    if (!adminData) return res.status(401).json({ error: 'Invalid credentials' });

    const inputHash = crypto.createHash('sha256').update(password).digest('hex');

    if (adminData.passwordHash === inputHash) {
      // Generate a simple session token
      const token = crypto.randomBytes(16).toString('hex');
      const role = adminData.role || 'superadmin';
      activeAdminTokens.set(token, { username, role });
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

  if (!session) {
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
    if (category !== undefined) updateData.category = category;
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

    const newProduct = {
      _id: newId,
      id: newId,
      name,
      category: category || 'Miscellaneous',
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
    logAdminActivity(req.adminSession.username, 'Update Order Status', `Changed order ${req.params.orderId} status from ${oldStatus} to ${status}`);
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
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
  console.log('✅ Connected to MongoDB');

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
