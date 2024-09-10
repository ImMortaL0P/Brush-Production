const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3000;

// Serve static files (frontend files in the public folder)
app.use(express.static('../public'));

// Create connection to MySQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'your_database_name'
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
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
