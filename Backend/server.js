// backend/server.js

const express = require('express');
const sql = require('mssql');
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

// Database configuration for Microsoft SQL Server
const dbConfig = {
    user: 'admin', // Your SQL Server username
    password: 'not_ImMortaL26', // Your SQL Server password
    server: 'products-1.c9ocia06gc0n.eu-north-1.rds.amazonaws.com', // SQL Server address or IP
    port: 1433,
    database: 'products', // Your database name
    options: {
        encrypt: true, // Use this option if you are connecting to Azure SQL Database
        trustServerCertificate: true // Disable for secure production environments
    }
};
// Connect to the database
// Connect to the SQL Server database
sql.connect(dbConfig).then(pool => {
    if (pool.connected) {
        console.log('Connected to Microsoft SQL Server');
    }


    // Endpoint to get products
    app.get('/products', async (req, res) => {
        try {
            const result = await pool.request().query('SELECT name, price, description, imageUrl FROM products');
            res.json(result.recordset);
        } catch (err) {
            console.error('Error fetching products:', err);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    });

}).catch(err => {
    console.error('Database connection failed:', err.stack);
});