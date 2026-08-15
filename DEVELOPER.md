# Developer Guide

Technical architecture reference for the Brush E-Commerce platform.

## Architecture Overview

The project is a decoupled frontend + backend:

- **`public/` (Frontend):** A static Single Page Application built with pure HTML, CSS, and Vanilla JavaScript. Communicates entirely via REST APIs.
- **`Backend/` (Backend):** A Node.js + Express server responsible for business logic, database operations, payment processing, and email delivery.

## Database — MongoDB Atlas

The primary database is **MongoDB Atlas** (driver: `mongodb` npm package). Collections:

| Collection     | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `products`     | Product catalog (posters, plates, wallpaper)               |
| `orders`       | Customer orders with fulfillment status tracking           |
| `users`        | Customer accounts (bcrypt-hashed passwords)                |
| `admins`       | Admin accounts with role-based permissions                 |
| `admin_logs`   | Audit trail for admin actions                              |
| `counters`     | Auto-increment sequences (invoice numbers, order IDs)      |

**Firebase** is used exclusively for **image storage** (product photos uploaded via the admin dashboard), not as the application database.

## Product Types System

`productTypes.js` defines a multi-product-type configuration:

- **Posters** — variant axes: Size (A5 → A1) × Paper GSM (170/300)
- **Decorative Plates** — variant axis: Round size (8″/10″/12″)
- **Wallpaper** — variant axis: Roll dimensions

Pricing is computed server-side via `priceWithVariants()`, preventing client-side price tampering.

## Admin Roles

The admin system supports three roles:

| Role          | Capabilities                                                        |
| ------------- | ------------------------------------------------------------------- |
| `superadmin`  | Full access — orders, inventory, add/delete products, homepage placement, manage admins |
| `stocker`     | Stock quantity updates only                                         |
| `watcher`     | Read-only order and inventory viewing                               |

## Frontend Structure

| File                    | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `index.html`            | Main storefront — hero, categories, bestsellers, new arrivals |
| `all_products.html`     | Full catalog with multi-category filtering and search     |
| `checkout.html`         | Multi-step checkout pipeline with Razorpay integration    |
| `admin.html`            | Role-based admin dashboard                                |
| `order-confirmation.html` | Order status tracking + PDF invoice download            |
| `script.js`             | Core rendering logic, auth state, modals, toasts          |
| `cart.js`               | localStorage cart module with variant-aware line items     |
| `styles.css`            | Global design system — CSS variables, dark/light theming  |
| `theme.js`              | Instant theme toggle (runs before paint to prevent FOUC)  |
| `navbar-scroll.js`      | Smart hide-on-scroll navbar + scroll progress bar         |
| `scroll.js`             | Smooth scrolling via Lenis with reduced-motion detection  |
| `micro-interactions.js` | Cursor follow effect + magnetic CTA button physics        |

## Backend Structure

| File                      | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `server.js`               | Primary Express application (~1,400 LOC)                |
| `productTypes.js`         | Product category config + server-side variant pricing   |
| `invoiceTemplate.js`      | PDF invoice builder (PDFKit)                            |
| `orderEmailTemplate.js`   | Responsive HTML + text email templates                  |
| `setupAdmin.js`           | CLI for creating/updating admin accounts                |
| `scripts/`                | One-off migration, seeding, and maintenance utilities   |

### Key API Endpoints

| Method | Path                       | Description                              |
| ------ | -------------------------- | ---------------------------------------- |
| GET    | `/api/products`            | Fetch all products                       |
| POST   | `/api/products`            | Create product (multipart image upload)  |
| POST   | `/api/orders`              | Place order (validates payment signature) |
| POST   | `/api/payment/create-order`| Generate Razorpay order ID               |
| GET    | `/api/config/razorpay`     | Fetch public Razorpay key                |
| POST   | `/api/auth/login`          | User authentication                      |
| POST   | `/api/auth/signup`         | User registration                        |
| POST   | `/api/admin/login`         | Admin authentication                     |
| GET    | `/api/health`              | Health check (uptime + MongoDB status)   |

## Security

1. **Razorpay Keys:** `RAZORPAY_KEY_SECRET` is server-only via `dotenv`. The public `KEY_ID` is served via `/api/config/razorpay`.
2. **Payment Integrity:** Server computes order amounts independently and verifies Razorpay signatures before confirming orders.
3. **Session TTLs:** Admin tokens expire after 12 hours, user tokens after 7 days. A background sweeper purges expired sessions every 15 minutes.
4. **Rate Limiting:** `express-rate-limit` on auth and payment endpoints.
5. **Security Headers:** `helmet` CSP policy on all responses.
6. **Input Sanitization:** `sanitizePlain()` rejects NoSQL injection objects (`$gt`, `$ne`, etc.) from request body fields.
7. **Secrets:** `.env`, `serviceAccountKey.json` are strictly `.gitignore`d.

## Environment Variables

See [`Backend/.env.example`](Backend/.env.example) for the complete list. The server validates critical variables at startup and exits with a clear error if `MONGODB_URI` is missing.
