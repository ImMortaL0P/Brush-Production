// Builds the HTML/text order-status email sent to customers, styled after
// standard e-commerce order-update emails (progress tracker, delivery box,
// itemized list) and populated from the real order document.

const STATUS_STEPS = ['confirmed', 'packed', 'shipped', 'delivered'];

const STATUS_META = {
  confirmed: {
    label: 'Order Placed',
    heading: 'Order Placed',
    message: 'Your order has been successfully placed.'
  },
  packed: {
    label: 'Order Packed',
    heading: 'Order Packed',
    message: 'Your order has been packed and will be shipped soon.'
  },
  shipped: {
    label: 'Order Shipped',
    heading: 'Order Shipped',
    message: 'Your order is on its way!'
  },
  delivered: {
    label: 'Order Delivered',
    heading: 'Order Delivered',
    message: 'Your order has been delivered. We hope you love it!'
  },
  cancelled: {
    label: 'Order Cancelled',
    heading: 'Order Cancelled',
    message: 'Your order has been cancelled.'
  }
};

const BRAND_ACCENT = '#ff9f29';
const BRAND_BLACK = '#000000';
const BRAND_CREAM = '#faf3e3';
const BORDER = '#ececec';
const TEXT_MUTED = '#767676';
const TEXT_PRIMARY = '#1a1a1a';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value, opts) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', opts);
}

function money(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`;
}

function absoluteUrl(siteUrl, relativePath) {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const joined = `${siteUrl.replace(/\/$/, '')}/${String(relativePath).replace(/^\//, '')}`;
  // encodeURI (not encodeURIComponent) - preserves the "/" separators while
  // escaping spaces and other unsafe characters in path segments like
  // "assets/Pop Culture/whiskey-neat.webp".
  return encodeURI(joined);
}

function renderStepper(status, accent) {
  if (!STATUS_STEPS.includes(status)) return ''; // cancelled, or unknown status: no stepper
  const currentIndex = STATUS_STEPS.indexOf(status);
  const stepLabels = ['Placed', 'Packed', 'Shipped', 'Delivered'];

  const cells = [];
  stepLabels.forEach((label, i) => {
    const done = i <= currentIndex;
    const dotColor = done ? accent : '#d9d9d9';
    cells.push(`
      <td width="1" style="padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td
          style="width:14px;height:14px;border-radius:50%;background:${dotColor};font-size:0;line-height:0;">&nbsp;</td></tr></table>
      </td>`);
    if (i < stepLabels.length - 1) {
      const lineColor = i < currentIndex ? accent : '#d9d9d9';
      cells.push(`<td style="padding:0 4px;"><div style="height:2px;background:${lineColor};font-size:0;line-height:0;">&nbsp;</div></td>`);
    }
  });

  const labelCells = stepLabels.map((label, i) => {
    const done = i <= currentIndex;
    return `<td align="${i === 0 ? 'left' : i === stepLabels.length - 1 ? 'right' : 'center'}" style="font-size:11px;font-weight:${done ? '700' : '400'};color:${done ? TEXT_PRIMARY : TEXT_MUTED};padding-top:6px;">${label}</td>`;
  }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;">
      <tr>${cells.join('')}</tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>${labelCells}</tr>
    </table>`;
}

function renderItemsRows(items, siteUrl) {
  return (items || []).map(item => {
    const imgUrl = absoluteUrl(siteUrl, item.image);
    return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${BORDER};" width="64">
        <img src="${escapeHtml(imgUrl)}" width="56" height="56" alt="${escapeHtml(item.name)}"
          style="display:block;width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid ${BORDER};">
      </td>
      <td style="padding:14px 0 14px 14px;border-bottom:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${escapeHtml(item.name)}</div>
        <div style="font-size:12px;color:${TEXT_MUTED};margin-top:2px;">Size: ${escapeHtml(item.size || 'A4')} &middot; ${escapeHtml(item.gsm || '80')}GSM &middot; Qty: ${escapeHtml(item.quantity)}</div>
      </td>
      <td align="right" style="padding:14px 0;border-bottom:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};white-space:nowrap;">
        ${money(item.subtotal)}
      </td>
    </tr>`;
  }).join('');
}

function buildOrderStatusEmail(order, siteUrl) {
  const status = order.status || 'confirmed';
  const meta = STATUS_META[status] || STATUS_META.confirmed;
  const orderId = order.orderId || order._id;
  const accent = status === 'cancelled' ? '#c62828' : BRAND_ACCENT;
  const logoUrl = absoluteUrl(siteUrl, 'assets/misc/Brush Text Arial.png');
  const trackUrl = `${siteUrl.replace(/\/$/, '')}/order-confirmation.html?orderId=${encodeURIComponent(orderId)}`;

  const placedDate = formatDate(order.createdAt, { month: 'short', day: '2-digit', year: 'numeric' });
  const deliveryDate = formatDate(order.estimatedDelivery, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const stepperHtml = renderStepper(status, accent);
  const itemsHtml = renderItemsRows(order.items, siteUrl);

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND_CREAM};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

        <tr><td style="background:${BRAND_BLACK};padding:20px 32px;">
          <img src="${escapeHtml(logoUrl)}" alt="Brush" height="24" style="display:block;">
        </td></tr>

        <tr><td style="padding:28px 32px 0;">
          <span style="display:inline-block;background:${accent};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;">${escapeHtml(meta.label)}</span>
        </td></tr>

        <tr><td style="padding:16px 32px 0;">
          <p style="margin:0 0 6px;font-size:16px;color:${TEXT_PRIMARY};">Hi <strong>${escapeHtml(order.customer.name)}</strong>,</p>
          <p style="margin:0;font-size:14px;color:${TEXT_MUTED};">${escapeHtml(meta.message)}</p>
        </td></tr>

        <tr><td style="padding:14px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;color:${TEXT_MUTED};">
            <tr>
              <td>Order placed on <strong style="color:${TEXT_PRIMARY};">${placedDate}</strong></td>
              <td align="right">Order ID <strong style="color:${TEXT_PRIMARY};">${escapeHtml(orderId)}</strong></td>
            </tr>
          </table>
        </td></tr>

        ${stepperHtml ? `<tr><td style="padding:0 32px;">${stepperHtml}</td></tr>` : ''}

        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;">
            <tr>
              <td style="padding:16px;" width="50%">
                <div style="font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">${status === 'cancelled' ? 'Order Total' : 'Estimated Delivery'}</div>
                <div style="font-size:14px;font-weight:700;color:${status === 'cancelled' ? TEXT_PRIMARY : accent};margin-top:2px;">${status === 'cancelled' ? money(order.total) : (deliveryDate || 'TBD')}</div>
              </td>
              <td style="padding:16px;border-left:1px solid ${BORDER};" width="50%">
                <div style="font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">Amount Paid</div>
                <div style="font-size:14px;font-weight:700;color:${TEXT_PRIMARY};margin-top:2px;">${money(order.total)}</div>
              </td>
            </tr>
            <tr><td colspan="2" align="center" style="padding:0 16px 16px;">
              <a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 24px;border-radius:6px;margin-top:4px;">Track Your Order</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="60%" style="vertical-align:top;font-size:13px;color:${TEXT_PRIMARY};line-height:1.5;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${TEXT_MUTED};margin-bottom:4px;">Delivery Address</div>
                ${escapeHtml(order.customer.name)}<br>
                ${escapeHtml(order.customer.address)}<br>
                ${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} ${escapeHtml(order.customer.pincode)}
              </td>
              <td width="40%" style="vertical-align:top;font-size:13px;color:${TEXT_PRIMARY};">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${TEXT_MUTED};margin-bottom:4px;">Email updates sent to</div>
                ${escapeHtml(order.customer.email)}
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};">
            ${itemsHtml}
          </table>
        </td></tr>

        <tr><td style="padding:16px 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:${TEXT_MUTED};">
            <tr><td>Subtotal</td><td align="right">${money(order.subtotal)}</td></tr>
            <tr><td style="padding-top:4px;">Shipping</td><td align="right" style="padding-top:4px;">${order.shipping ? money(order.shipping) : 'FREE'}</td></tr>
            ${order.discount ? `<tr><td style="padding-top:4px;">Discount</td><td align="right" style="padding-top:4px;">-${money(order.discount)}</td></tr>` : ''}
            <tr><td style="padding-top:10px;border-top:1px solid ${BORDER};font-weight:700;color:${TEXT_PRIMARY};font-size:14px;">Total</td><td align="right" style="padding-top:10px;border-top:1px solid ${BORDER};font-weight:700;color:${TEXT_PRIMARY};font-size:14px;">${money(order.total)}</td></tr>
          </table>
        </td></tr>

        <tr><td style="background:${BRAND_CREAM};padding:24px 32px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${TEXT_PRIMARY};">Thank you for shopping with Brush!</p>
          <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">Got questions about your order? Reply to this email and we'll help you out.</p>
        </td></tr>

      </table>
      <p style="max-width:600px;margin:16px auto 0;font-size:11px;color:${TEXT_MUTED};font-family:Arial,Helvetica,sans-serif;text-align:center;">
        This email refers to order ${escapeHtml(orderId)} placed on brushposters. Please do not reply if this address is marked no-reply.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${order.customer.name},

${meta.message}

Order ID: ${orderId}
Order placed on: ${placedDate}
${status !== 'cancelled' ? `Estimated delivery: ${deliveryDate || 'TBD'}\n` : ''}Amount Paid: ${money(order.total)}

Delivery Address:
${order.customer.name}
${order.customer.address}
${order.customer.city}, ${order.customer.state} ${order.customer.pincode}

Items:
${(order.items || []).map(i => `- ${i.name} (Qty ${i.quantity}) - ${money(i.subtotal)}`).join('\n')}

Track your order: ${trackUrl}

Thank you for shopping with Brush!`;

  return {
    subject: `${meta.heading} - Order ${orderId}`,
    html,
    text
  };
}

module.exports = { buildOrderStatusEmail };
