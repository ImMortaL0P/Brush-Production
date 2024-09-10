const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for all requests

// MySQL database connection
const db = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12730637', // Replace with your MySQL username
    password: 'l1SYxaCmja', // Replace with your MySQL password
    database: 'sql12730637'
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// API route to get products
app.get('/products', (req, res) => {
    const query = 'SELECT * FROM products';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).send('Server error');
        } else {
            res.json(results);
        }
    });
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
