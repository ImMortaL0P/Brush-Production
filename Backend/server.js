const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 5500;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const products = [
  { id: 1, name: 'Anime Girls Collection', price: 149, originalPrice: 299, image: 'Testimonials 1.jpg', category: 'Anime', badge: 'Sale', description: 'Set of 2 premium anime posters' },
  { id: 2, name: 'CyberPunk Collection', price: 79, originalPrice: 199, image: 'Testimonials 2.jpg', category: 'Movies & TV', badge: 'Sale', description: 'Cyberpunk themed poster' },
  { id: 3, name: 'Minimalist Collection', price: 85, originalPrice: 199, image: 'Testimonials 3.jpg', category: 'Minimalist', badge: '', description: 'Clean minimalist poster' },
  { id: 4, name: 'John Wick — Movie Poster', price: 99, originalPrice: 199, image: 'John Wick.png', category: 'Movies & TV', badge: 'New', description: 'John Wick movie poster' },
  { id: 5, name: 'Space Frontier Pack', price: 149, originalPrice: 299, image: 'Testimonials 1.jpg', category: 'Space & Sci-Fi', badge: 'New', description: 'Space themed poster pack' },
  { id: 6, name: 'Neon City Vibes', price: 129, originalPrice: 249, image: 'Testimonials 2.jpg', category: 'Cyberpunk', badge: 'New', description: 'Neon cyberpunk city poster' },
  { id: 7, name: 'Abstract Waves Set', price: 99, originalPrice: 199, image: 'Testimonials 3.jpg', category: 'Minimalist', badge: 'New', description: 'Abstract waves poster set' },
  { id: 8, name: 'Movie Legends Pack', price: 179, originalPrice: 349, image: 'John Wick.png', category: 'Movies & TV', badge: 'New', description: 'Movie legends collection' },
  { id: 9, name: 'Cosmic Dreams Set', price: 199, originalPrice: 399, image: 'Landing Slideshow 2x f.jpg', category: 'Space & Sci-Fi', badge: 'New', description: 'Cosmic themed poster set' },
  { id: 10, name: 'Modern Art Wall Kit', price: 159, originalPrice: 299, image: 'Landing Slideshow 3x f.jpg', category: 'Minimalist', badge: 'New', description: 'Modern art wall setup kit' }
];

const orders = [];

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/orders', (req, res) => {
  const { customer, items, paymentMethod } = req.body;

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
  
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
    }
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
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  res.status(201).json({ order });
});

app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ order });
});

app.post('/api/orders/:orderId/cancel', (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (order.status !== 'confirmed') {
    return res.status(400).json({ error: 'Order cannot be cancelled' });
  }
  order.status = 'cancelled';
  res.json({ message: 'Order cancelled successfully', order });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});