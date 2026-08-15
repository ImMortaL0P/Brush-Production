# Brush — Premium Poster & Wall Art E-Commerce

Welcome to **Brush**, a full-featured e-commerce platform for premium posters, decorative plates, and wallpaper, built with a decoupled static frontend and a Node.js + Express backend.

## Features

- **Dynamic Frontend:** Fast, responsive storefront built with HTML, CSS, and Vanilla JavaScript — dark/light theme toggle, smooth scrolling (Lenis), and micro-interactions.
- **Multi-Product Types:** Posters (multiple sizes & paper weights), decorative plates (round sizes), and wallpaper (roll dimensions) with variant-aware pricing.
- **Inventory Management:** Real-time stock tracking with automatic out-of-stock handling across the entire store.
- **Admin Dashboard:** Role-based admin portal (`superadmin`, `stocker`, `watcher`) for order fulfillment, PDF invoices, inventory editing, and activity logs.
- **Integrated Payments:** Razorpay checkout supporting UPI, Credit Cards, Debit Cards, and Cash on Delivery.
- **Cloud Database:** Powered by **MongoDB Atlas** for products, orders, users, and admin management.
- **Image Storage:** Firebase Storage for product image uploads via the admin dashboard.
- **Transactional Emails:** Automated order confirmation and status update emails via Nodemailer.

## Getting Started

### Prerequisites

- Node.js 20.x
- A MongoDB Atlas cluster (or local MongoDB)
- Firebase project (for image storage)
- Razorpay account (for payments — optional for development, mock mode available)

### 1. Configure Environment

```bash
cd Backend
cp .env.example .env
# Fill in your MongoDB URI, Razorpay keys, SMTP credentials, etc.
```

See [`Backend/.env.example`](Backend/.env.example) for all required and optional variables.

### 2. Start the Backend

```bash
cd Backend
npm install
npm run dev          # Development with auto-reload (--watch)
# or
npm start            # Production
```

### 3. Start the Frontend

The frontend is a static SPA inside `public/`. Serve it with any local server:

```bash
npm run dev:frontend   # from root — serves on port 3000
```

Then visit `http://localhost:3000` in your browser.

### 4. Create an Admin Account

```bash
cd Backend
npm run setup-admin
```

## Project Structure

```
├── Backend/
│   ├── server.js              # Express API server (MongoDB, auth, payments, emails)
│   ├── productTypes.js        # Product category config & variant pricing
│   ├── invoiceTemplate.js     # PDF invoice builder (PDFKit)
│   ├── orderEmailTemplate.js  # Transactional email templates
│   ├── setupAdmin.js          # Admin account provisioning CLI
│   ├── scripts/               # One-off migration, seeding & maintenance utilities
│   └── .env.example           # Environment variable template
├── public/
│   ├── index.html             # Main storefront
│   ├── all_products.html      # Product catalog with filtering & search
│   ├── checkout.html          # Multi-step checkout with Razorpay
│   ├── admin.html             # Admin dashboard
│   ├── order-confirmation.html
│   ├── styles.css             # Global design system (CSS variables, dark/light)
│   ├── script.js              # Core frontend logic
│   ├── cart.js                # Cart module (localStorage)
│   └── ...
└── README.md
```

## Deployment

- **Frontend:** Automatically deploys to GitHub Pages on push to `main`.
- **Backend:** Host on any Node.js provider — Render, Railway, Heroku, etc. Set the health check URL to `/api/health`.
