# Brush — Premium Poster E-Commerce

Welcome to **Brush**, a state-of-the-art e-commerce platform dedicated to high-quality, premium posters and wall art. 

## Features
- **Dynamic Frontend:** Fast, responsive, and beautiful user interface built with HTML, CSS, and Vanilla JavaScript.
- **Inventory Management:** Full stock tracking. Items automatically update to "Out of Stock" across the store when inventory depletes.
- **Admin Dashboard:** A secure admin portal to view orders, update fulfillment statuses, and instantly add new posters to the storefront.
- **Integrated Payments:** Built-in Razorpay checkout supporting UPI, Credit Cards, and Debit Cards natively.
- **Cloud Database:** Powered by Firebase Firestore for real-time inventory and order processing.

## Getting Started

To run this project locally, you need to start both the static frontend and the Node.js backend.

### 1. Start the Backend
The backend handles database connections, Razorpay order generation, and secure Admin authentication.
```bash
cd Backend
npm install
node server.js
```
*Note: The backend requires a `.env` file with your `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, as well as a Firebase `serviceAccountKey.json` to connect to Firestore.*

### 2. Start the Frontend
The frontend lives entirely inside the `public/` directory. You can serve it using any local server.
```bash
cd public
npx http-server -p 3000
```
Then visit `http://localhost:3000` in your browser.

## Deployment
The frontend is configured to automatically deploy to **GitHub Pages** whenever changes are pushed to the `main` branch. The backend should be hosted separately on a Node.js-compatible provider like Render, Heroku, or Railway.
