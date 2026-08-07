// Draws the PDF invoice onto an already-created PDFDocument. Brush is
// presented as a consumer brand of the legal/billing entity, Krafters Inc.
//
// NOTE: GSTIN, CIN, phone and bank details below are placeholders, explicitly
// fabricated per product owner instruction (no real registration exists for
// them yet) - swap them for the real numbers once Krafters Inc. has them.

const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '../public/assets/misc/Brush Text Arial.png');
const SIGNATURE_PATH = path.join(__dirname, 'assets/signature.png');

const COMPANY = {
  legalName: 'Krafters Inc.',
  brandLine: 'Brush — a consumer brand of Krafters Inc.',
  addressLines: ['Vijay Complex, Rampur Road', 'Bazar Samiti, Patna, Bihar 800003'],
  email: 'admin_brush@mangalam.cc',
  phone: '+91 90000 00000', // placeholder
  gstin: '10ABCDE1234F1Z5', // placeholder
  cin: 'U74999BR2024PTC012345', // placeholder
  bankName: 'Krafters Inc. — Current Account',
  bankAccount: 'A/C # 5012 3456 7890', // placeholder
  bankIfsc: 'IFSC # HDFC0001234' // placeholder
};

const SIGNATORY_NAME = 'Kumar Mangalam';
const SIGNATORY_TITLE = 'Authorised Signatory';

function money(n) {
  return 'Rs. ' + Number(n || 0).toFixed(2);
}

function drawInvoice(pdfDoc, order) {
  // ---- Header ----
  // The Brush wordmark PNG is cream/white (built for the site's black navbar)
  // and disappears on a plain white PDF page, so give it a matching dark
  // band rather than rendering it directly on white.
  pdfDoc.rect(0, 0, pdfDoc.page.width, 110).fill('#000000');

  if (fs.existsSync(LOGO_PATH)) {
    pdfDoc.image(LOGO_PATH, 50, 32, { width: 130 });
  } else {
    pdfDoc.fontSize(28).font('Helvetica-Bold').fillColor('#faf3e3').text('Brush', 50, 38);
  }
  pdfDoc.fontSize(8).font('Helvetica').fillColor('#c9c2b0').text(COMPANY.brandLine, 50, 78);

  pdfDoc.fontSize(22).font('Helvetica-Bold').fillColor('#faf3e3').text('TAX INVOICE', 300, 45, { width: 245, align: 'right' });

  // ---- From / Invoice meta ----
  pdfDoc.fontSize(10).fillColor('#4a5568');
  pdfDoc.font('Helvetica-Bold').text('From:', 50, 115);
  pdfDoc.font('Helvetica-Bold').text(COMPANY.legalName, 50, 128);
  pdfDoc.font('Helvetica');
  COMPANY.addressLines.forEach((line, i) => pdfDoc.text(line, 50, 142 + i * 13));
  pdfDoc.text(`GSTIN: ${COMPANY.gstin}`, 50, 142 + COMPANY.addressLines.length * 13);
  pdfDoc.text(COMPANY.email, 50, 142 + (COMPANY.addressLines.length + 1) * 13);

  const metaTop = 115;
  const rightCol = 330;
  const boxW = 220;

  pdfDoc.rect(rightCol, metaTop, boxW, 100).strokeColor('#cbd5e0').stroke();
  [20, 40, 60, 80].forEach(offset => {
    pdfDoc.moveTo(rightCol, metaTop + offset).lineTo(rightCol + boxW, metaTop + offset).stroke();
  });
  pdfDoc.moveTo(rightCol + 95, metaTop).lineTo(rightCol + 95, metaTop + 100).stroke();

  const invoiceNumber = order.invoiceNumber || order.orderId; // legacy orders predate invoiceNumber
  const invoiceDate = new Date(order.createdAt instanceof Date ? order.createdAt : (order.createdAt || Date.now()));
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 15);

  const metaRow = (label, value, offset, bold) => {
    pdfDoc.font('Helvetica-Bold').fillColor('#2d3748').text(label, rightCol + 5, metaTop + offset + 6, { width: 88 });
    pdfDoc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, rightCol + 100, metaTop + offset + 6, { width: boxW - 105 });
  };
  metaRow('Invoice No.', invoiceNumber, 0);
  metaRow('Order No.', order.orderId, 20);
  metaRow('Invoice Date', invoiceDate.toLocaleDateString('en-IN'), 40);
  metaRow('Due Date', dueDate.toLocaleDateString('en-IN'), 60);
  metaRow('Total Due', money(order.total), 80, true);

  // ---- Bill To ----
  pdfDoc.font('Helvetica-Bold').fillColor('#2d3748').text('Bill To:', 50, 235);
  pdfDoc.font('Helvetica').fillColor('#4a5568');
  pdfDoc.text(order.customer.name, 50, 249);
  pdfDoc.text(order.customer.address, 50, 262);
  pdfDoc.text(`${order.customer.city}, ${order.customer.state} ${order.customer.pincode}`, 50, 275);
  pdfDoc.text(order.customer.email, 50, 288);

  // ---- Items table ----
  const tableTop = 315;
  pdfDoc.rect(50, tableTop, 500, 20).fillAndStroke('#f7fafc', '#cbd5e0');
  pdfDoc.fillColor('#2d3748').font('Helvetica-Bold').fontSize(10);
  pdfDoc.text('Qty', 60, tableTop + 5);
  pdfDoc.text('Product', 100, tableTop + 5);
  pdfDoc.text('Rate', 330, tableTop + 5, { width: 70, align: 'right' });
  pdfDoc.text('Discount', 400, tableTop + 5, { width: 60, align: 'right' });
  pdfDoc.text('Sub Total', 470, tableTop + 5, { width: 70, align: 'right' });

  let y = tableTop + 25;
  pdfDoc.font('Helvetica');

  order.items.forEach(item => {
    pdfDoc.fillColor('#2d3748').text(item.quantity.toString(), 60, y + 5);
    pdfDoc.font('Helvetica-Bold').text(item.name, 100, y + 5, { width: 220 });
    pdfDoc.font('Helvetica').fillColor('#718096').text(`Size: ${item.size || 'A4'} | Paper: ${item.gsm || '80'} GSM`, 100, y + 17);
    pdfDoc.fillColor('#2d3748').text(money(item.price), 330, y + 5, { width: 70, align: 'right' });
    pdfDoc.text('0.00%', 400, y + 5, { width: 60, align: 'right' });
    pdfDoc.text(money(item.subtotal), 470, y + 5, { width: 70, align: 'right' });

    pdfDoc.moveTo(50, y + 35).lineTo(550, y + 35).strokeColor('#e2e8f0').stroke();
    y += 35;
  });

  // ---- Totals ----
  const hasDiscount = order.discount > 0;
  const summaryRows = hasDiscount ? 4 : 3;
  const summaryTop = y + 10;
  const summaryH = summaryRows * 20 + 5;

  pdfDoc.rect(330, summaryTop - 5, 220, summaryH).strokeColor('#cbd5e0').stroke();
  for (let i = 1; i < summaryRows; i++) {
    pdfDoc.moveTo(330, summaryTop - 5 + i * 20).lineTo(550, summaryTop - 5 + i * 20).stroke();
  }
  pdfDoc.moveTo(430, summaryTop - 5).lineTo(430, summaryTop - 5 + summaryH).stroke();

  let sy = summaryTop;
  pdfDoc.font('Helvetica').fillColor('#2d3748');
  pdfDoc.text('Sub Total', 340, sy, { width: 80 });
  pdfDoc.text(money(order.subtotal), 440, sy, { width: 100, align: 'right' });
  sy += 20;

  pdfDoc.text('Shipping', 340, sy, { width: 80 });
  pdfDoc.text(order.shipping ? money(order.shipping) : 'FREE', 440, sy, { width: 100, align: 'right' });
  sy += 20;

  if (hasDiscount) {
    pdfDoc.text('Discount', 340, sy, { width: 80 });
    pdfDoc.text('-' + money(order.discount), 440, sy, { width: 100, align: 'right' });
    sy += 20;
  }

  pdfDoc.font('Helvetica-Bold');
  pdfDoc.text('Total', 340, sy, { width: 80 });
  pdfDoc.text(money(order.total), 440, sy, { width: 100, align: 'right' });

  // ---- PAID watermark ----
  if (order.paymentMethod !== 'cod') {
    pdfDoc.save()
      .translate(280, 420)
      .rotate(-30)
      .fontSize(100)
      .fillColor('#e2e8f0')
      .fillOpacity(0.3)
      .text('PAID', 0, 0, { align: 'center' })
      .restore();
  }

  // ---- Bank details (left) + Signature (right) ----
  const belowTotalsY = summaryTop + summaryH + 30;

  pdfDoc.fontSize(9).fillColor('#4a5568').font('Helvetica-Bold');
  pdfDoc.text('Bank Details', 50, belowTotalsY);
  pdfDoc.font('Helvetica');
  pdfDoc.text(COMPANY.bankName, 50, belowTotalsY + 13);
  pdfDoc.text(COMPANY.bankAccount, 50, belowTotalsY + 26);
  pdfDoc.text(COMPANY.bankIfsc, 50, belowTotalsY + 39);

  const sigX = 380;
  const sigLineY = belowTotalsY + 45;
  if (fs.existsSync(SIGNATURE_PATH)) {
    pdfDoc.image(SIGNATURE_PATH, sigX, belowTotalsY - 25, { width: 120, height: 55, fit: [120, 55] });
  }
  pdfDoc.moveTo(sigX, sigLineY).lineTo(sigX + 170, sigLineY).strokeColor('#cbd5e0').stroke();
  pdfDoc.fontSize(9).font('Helvetica-Bold').fillColor('#2d3748').text(SIGNATORY_NAME, sigX, sigLineY + 6);
  pdfDoc.font('Helvetica').fillColor('#718096').text(SIGNATORY_TITLE, sigX, sigLineY + 18);
  pdfDoc.text(COMPANY.legalName, sigX, sigLineY + 30);

  // ---- Footer ----
  pdfDoc.fontSize(8).fillColor('#a0aec0');
  pdfDoc.text('Payment is due within 15 days from the date of invoice. This is a computer-generated invoice and does not require a physical stamp.', 50, 730, { width: 500 });
  pdfDoc.text(`Thanks for shopping with Brush, a Krafters Inc. brand | ${COMPANY.email} | ${COMPANY.phone} | CIN: ${COMPANY.cin}`, 50, 750, { width: 500 });
}

module.exports = { drawInvoice };
