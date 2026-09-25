// Sends a sample "order confirmed" email with the invoice PDF attached,
// using the SMTP settings in Backend/.env. No database needed.
// Usage: node Backend/scripts/test_order_email.js you@example.com
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { buildOrderStatusEmail } = require('../orderEmailTemplate');
const { drawInvoice } = require('../invoiceTemplate');

const to = process.argv[2];
if (!to) { console.error('Usage: node Backend/scripts/test_order_email.js <to-email>'); process.exit(1); }

const SITE_URL = process.env.SITE_URL || 'https://immortal0p.github.io/Brush-Production';
const now = new Date();
const items = [
  { name: 'Test Poster — Typography', image: 'assets/misc/favicon.png', productType: 'poster', variants: { size: 'A3', gsm: '300' }, quantity: 2, price: 299, subtotal: 598, sku: 'TEST-POSTER-01' },
  { name: 'Test Tee — Classic Crew', image: 'assets/misc/favicon.png', productType: 'tshirt', variants: { size: 'L' }, quantity: 1, price: 549, subtotal: 549, sku: 'TEST-TEE-01' }
];
const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
const gst = Math.round(subtotal * 0.12 * 100) / 100, shipping = 60, codFee = 0, discount = 0;
const order = {
  _id: 'ORD-TEST' + Date.now().toString(36).toUpperCase(),
  invoiceNumber: 'INV-TEST-0001',
  status: 'confirmed',
  paymentMethod: 'razorpay',
  customer: { name: 'Kumar Mangalam', email: to, address: 'Vijay Complex, Rampur Road', city: 'Patna', state: 'Bihar', pincode: '800003' },
  items, subtotal, gst, shipping, codFee, discount,
  total: subtotal + gst + shipping + codFee - discount,
  createdAt: now,
  estimatedDelivery: new Date(now.getTime() + 6 * 864e5).toISOString()
};
order.orderId = order.id = order._id;

function renderInvoicePdf(o) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    drawInvoice(doc, o); doc.end();
  });
}

(async () => {
  const port = Number(process.env.SMTP_PORT) || 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  if(process.env.DRY){const {subject,html}=buildOrderStatusEmail(order,SITE_URL);require("fs").writeFileSync(process.env.DRY+".pdf",await renderInvoicePdf(order));require("fs").writeFileSync(process.env.DRY+".html",html);console.log("dry",subject);return;} await transporter.verify();
  console.log('SMTP login OK:', process.env.SMTP_HOST, process.env.SMTP_USER);
  const { subject, html, text } = buildOrderStatusEmail(order, SITE_URL);
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM, replyTo: process.env.EMAIL_REPLY_TO || undefined, to,
    subject: '[TEST] ' + subject, html, text,
    attachments: [{ filename: `invoice-${order.invoiceNumber}.pdf`, content: await renderInvoicePdf(order), contentType: 'application/pdf' }]
  });
  console.log('Sent:', info.messageId, info.response);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
