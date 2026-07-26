# Developer Guide

This guide details the technical architecture and structure of the Brush E-Commerce platform.

## Architecture Overview

The project is split into a decoupled frontend and backend:
- **`public/` (Frontend):** A static Single Page Application (SPA) built with pure HTML, CSS, and Vanilla JavaScript. It communicates entirely via REST APIs.
- **`Backend/` (Backend):** A Node.js and Express server responsible for business logic, database transactions, and secure API integrations (Razorpay).

## Frontend Structure
- **`index.html`**: The main storefront, featuring a hero section, bestsellers, categories, and new arrivals.
- **`checkout.html`**: The checkout pipeline which handles customer data collection and initiates Razorpay.
- **`admin.html`**: The secure admin dashboard for managing orders and inventory.
- **`script.js`**: Core rendering logic for products and UI interactions (modals, toasts).
- **`cart.js`**: The local storage cart system and checkout processing logic.
- **`styles.css`**: The global design system, utilizing CSS variables for themeing and responsiveness.

## Backend Structure
- **`server.js`**: The primary Express application.
  - **Firestore Setup**: Connects using `firebase-admin` via a secure `serviceAccountKey.json`.
  - **Auth Middleware**: Secures admin routes via simple bearer token verification (`activeAdminToken`).
  - **Endpoints**:
    - `GET /api/products`: Fetches all inventory.
    - `POST /api/products`: Uses `multer` to handle image uploads and creates new database entries.
    - `POST /api/orders`: Validates payment signatures and handles transaction processing.
    - `POST /api/payment/create-order`: Securely generates Razorpay order IDs.

## Security Considerations
1. **Razorpay Keys**: The `RAZORPAY_KEY_SECRET` must never be exposed. It is securely loaded into the Node environment via `dotenv`. The `RAZORPAY_KEY_ID` is safe to expose and is fetched dynamically by the frontend.
2. **Git Tracking**: Ensure `.env` and `serviceAccountKey.json` are strictly ignored by `.gitignore`. Do not commit these files.
3. **Database Rules**: Firestore is accessed via the Admin SDK, bypassing standard client-side rules. Ensure the Node API endpoints sanitize all inputs before writing to Firestore.
