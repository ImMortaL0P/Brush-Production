const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log('✅ Connected to Firebase Firestore!');

const db = admin.firestore();
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
    res.json(snapshot.docs[0].data());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, paymentMethod } = req.body;

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
      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      
      enrichedItems.push({
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
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
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save to Firestore
    await ordersRef.doc(orderId).set(order);
    
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});