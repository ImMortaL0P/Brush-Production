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

- **Posters** — variant axis: Size (A5, A4, A3, 8×10″ … 18×24″), priced from the Qikink rate table
- **T-Shirts** (`apparel`) — style × print × size, priced from the Qikink rate table
- **Wallpaper** — variant axis: Roll dimensions
- **Stickers, Collectibles** — no variants; each product keeps its own price

Pricing is computed server-side via `priceWithVariants()`, preventing client-side price tampering. `public/cart.js` mirrors the table for display — regenerate it with `python3 tools/sync-cart-config.py` after editing `productTypes.js`.

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
| `all_products.html` + `store.js` / `store.css` | Store: category tabs, faceted filters, sort, grid; state in the URL |
| `poster-reels.html` + `reels.js` / `reels.css` | "Browse Posters": full-screen swipe feed, double-tap to add to cart |
| `checkout.html`         | Multi-step checkout pipeline with Razorpay integration    |
| `admin.html` + `admin.js` / `admin.css` | Role-based admin dashboard (orders, inventory, add product, pricing, activity log) |
| `order-confirmation.html` | Order status tracking + PDF invoice download            |
| `global-navbar.js`      | `<global-navbar>` on every page; also Back-button handling for overlays (`BrushBack`) |
| `global-footer.js`      | `<global-footer>` on every page                           |
| `site-overlays.js`      | `<site-overlays>`: search, login/account/orders, product modal, cart drawer, toast |
| `img-utils.js`          | `BrushImg`: resized WebP thumbnails (`img/w480`, `img/w1080`) with fallbacks — regenerate with `python3 tools/make-thumbs.py` |
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
2. **Payment Integrity:** Server computes order amounts independently and verifies Razorpay signatures before confirming orders. If Razorpay can't be reached, online payment is refused (503) — the fake `order_mock_` payment path only exists when `ALLOW_MOCK_PAYMENTS=true`, for local development.
3. **Session TTLs:** Admin tokens expire after 12 hours, user tokens after 7 days. A background sweeper purges expired sessions every 15 minutes.
4. **Rate Limiting:** `express-rate-limit` on auth and payment endpoints.
5. **Security Headers:** `helmet` CSP policy on all responses.
6. **Input Sanitization:** Fields used in queries must be strings/integers (`isNonEmptyString`, integer checks on order items), so objects like `{"$gt": ...}` can't act as MongoDB operators; shopper text is stored via `cleanText()` (trimmed, length-capped).
7. **Secrets:** `.env`, `serviceAccountKey.json` are strictly `.gitignore`d.

## Environment Variables

See [`Backend/.env.example`](Backend/.env.example) for the complete list. The server validates critical variables at startup and exits with a clear error if `MONGODB_URI` is missing.
