// backend/server.js

const express = require('express');
const mysql = require('mysql');
const cors = require('cors'); // Import CORS
const app = express();
const port = 3000; // Backend server port

// Enable CORS to allow requests from frontend (port 5500)
app.use(cors({
    origin: 'http://localhost:5500' // Adjust this if your frontend is served from a different origin
}));

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

// Start the server
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
