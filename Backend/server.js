require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const multer = require('multer');

const app = express();
let activeAdminToken = null; // Store token in memory for simple auth
const port = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET'
});

// Setup multer for image uploads
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'prod-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// ==========================================
// FIREBASE INITIALIZATION
// ==========================================
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ FATAL ERROR: 'serviceAccountKey.json' is missing in the Backend folder.");
  console.error("Please download it from Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
initializeApp({
  credential: cert(serviceAccount)
});

console.log('✅ Connected to Firebase Firestore!');

const db = getFirestore();
const productsRef = db.collection('products');
const ordersRef = db.collection('orders');


// ==========================================
// API ENDPOINTS
// ==========================================

app.get('/api/products', async (req, res) => {
  try {
    const snapshot = await productsRef.orderBy('id', 'asc').get();
    const products = snapshot.docs.map(doc => doc.data());
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const snapshot = await productsRef.where('id', '==', parseInt(req.params.id)).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Product not found' });
    const product = snapshot.docs[0].data();
    product.reviews = product.reviews || [];
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { user, rating, comment } = req.body;
    if (!user || !rating || !comment) return res.status(400).json({ error: 'Missing review fields' });

    const productId = parseInt(req.params.id);
    const snapshot = await productsRef.where('id', '==', productId).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Product not found' });

    const docRef = snapshot.docs[0].ref;
    const product = snapshot.docs[0].data();
    const reviews = product.reviews || [];
    
    const newReview = {
      user,
      rating: parseInt(rating),
      comment,
      date: new Date().toISOString()
    };
    
    reviews.push(newReview);
    await docRef.update({ reviews });
    
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
  try {
    const { customer, items, paymentMethod, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

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
    
    // Process items against Firestore products
    for (const item of items) {
      const productSnap = await productsRef.where('id', '==', item.productId).limit(1).get();
      if (productSnap.empty) {
        return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
      }
      const product = productSnap.docs[0].data();
      
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
      id: orderId,
      orderId: orderId,
      customer,
      items: enrichedItems,
      paymentMethod,
      subtotal,
      shipping,
      discount,
      total,
      status: 'confirmed',
      estimatedDelivery: estimatedDelivery.toISOString(),
      createdAt: FieldValue.serverTimestamp()
    };

    // Save to Firestore
    const batch = db.batch();
    batch.set(ordersRef.doc(orderId), order);
    
    // Deduct stock
    for (const item of enrichedItems) {
      const productSnap = await productsRef.where('id', '==', item.productId).limit(1).get();
      if (!productSnap.empty) {
        const docRef = productSnap.docs[0].ref;
        batch.update(docRef, { stockQuantity: FieldValue.increment(-item.quantity) });
      }
    }
    
    await batch.commit();
    
    // Convert timestamp back for the immediate JSON response
    order.createdAt = new Date().toISOString();

    res.status(201).json({ order });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const doc = await ordersRef.doc(req.params.orderId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
    
    const order = doc.data();
    // Convert Firestore Timestamp to ISO string
    if (order.createdAt && order.createdAt.toDate) {
      order.createdAt = order.createdAt.toDate().toISOString();
    }
    
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/orders/:orderId/cancel', async (req, res) => {
  try {
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
    
    const order = doc.data();
    if (order.status !== 'confirmed') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }
    
    await docRef.update({ status: 'cancelled' });
    order.status = 'cancelled';
    
    // Convert Firestore Timestamp to ISO string
    if (order.createdAt && order.createdAt.toDate) {
      order.createdAt = order.createdAt.toDate().toISOString();
    }
    
    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

app.get('/api/orders/:orderId/invoice', async (req, res) => {
  try {
    const doc = await ordersRef.doc(req.params.orderId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
    
    const order = doc.data();
    
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
    
    const invoiceDate = new Date(order.createdAt && order.createdAt.toDate ? order.createdAt.toDate() : order.createdAt || Date.now());
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
    
    const doc = await db.collection('admins').doc(username).get();
    if (!doc.exists) return res.status(401).json({ error: 'Invalid credentials' });
    
    const adminData = doc.data();
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    
    if (adminData.passwordHash === inputHash) {
      // Generate a simple session token
      activeAdminToken = crypto.randomBytes(16).toString('hex');
      res.json({ success: true, token: activeAdminToken });
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
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== activeAdminToken) {
    return res.status(401).json({ error: 'Unauthorized. Please login again.' });
  }
  next();
};

// Get all orders
app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const snapshot = await ordersRef.orderBy('createdAt', 'desc').get();
    const orders = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      orders.push(data);
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
    const { name, price, badge, stockQuantity, category } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = Number(price);
    if (badge !== undefined) updateData.badge = badge;
    if (stockQuantity !== undefined) updateData.stockQuantity = Number(stockQuantity);
    if (category !== undefined) updateData.category = category;
    
    // First try by doc ID (for newer products)
    let docRef = productsRef.doc(req.params.id.toString());
    const doc = await docRef.get();
    
    // If not found, try querying by the numeric 'id' field (for older products)
    if (!doc.exists) {
      const productId = parseInt(req.params.id);
      const snapshot = await productsRef.where('id', '==', productId).limit(1).get();
      if (snapshot.empty) return res.status(404).json({ error: 'Product not found' });
      docRef = snapshot.docs[0].ref;
    }
    
    await docRef.update(updateData);
    res.json({ success: true });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.post('/api/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, price, originalPrice, badge, description, stockQuantity } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Auto-generate numeric ID based on highest existing ID
    const snapshot = await productsRef.get();
    let maxId = 0;
    snapshot.forEach(doc => {
      const docId = parseInt(doc.id, 10);
      if (!isNaN(docId) && docId > maxId) maxId = docId;
    });
    const newId = maxId + 1;

    let imageUrl = '';
    if (req.file) {
      imageUrl = 'uploads/' + req.file.filename;
    }

    const newProduct = {
      id: newId,
      name,
      category: category || 'Miscellaneous',
      price: Number(price),
      originalPrice: Number(originalPrice || price),
      badge: badge || '',
      description: description || '',
      stockQuantity: Number(stockQuantity || 0),
      image: imageUrl,
      createdAt: FieldValue.serverTimestamp()
    };

    await productsRef.doc(newId.toString()).set(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update order status
app.patch('/api/orders/:orderId/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' });
    
    await docRef.update({ status });
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});