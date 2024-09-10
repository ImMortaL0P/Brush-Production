// backend/server.js

const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const port = 5500; // Backend server port

// Enable CORS to allow requests from frontend (port 5500)
app.use(cors({
    origin: 'http://localhost:5500',  // Ensure this matches your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow necessary HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow necessary headers
}));

// Your other middleware and routes
app.get('/products', (req, res) => {
    res.json([
        // Array of product objects (replace with actual data from your database)
    ]);
});

app.listen(5500, () => {
    console.log('Server running on http://localhost:5500');
});
// Serve static files if needed (optional)
// app.use(express.static('public'));

// Create connection to MySQL database
const db = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12730637', // Your MySQL username
    password: 'l1SYxaCmja', // Your MySQL password
    database: 'sql12730637' // Replace with your database name
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

// Endpoint to get products
app.get('/products', (req, res) => {
    const sql = 'SELECT name, price, description, imageUrl FROM products';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).json({ error: 'Failed to fetch products' });
            return;
        }
        res.json(results);
    });
});
