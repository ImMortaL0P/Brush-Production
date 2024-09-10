// frontend/app.js

// Function to fetch products from the backend server
async function fetchProducts() {
    try {
        const response = await fetch('http://localhost:5500/products'); 
        console.log('Response:', response);// Ensure this URL matches your backend endpoint
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        console.log('Products:', products);
        displayProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        const productList = document.getElementById('product-list');
        productList.innerHTML = '<p>Failed to load products. Please try again later.</p>';
    }
}

// Function to display products on the page
function displayProducts(products) {
    const productList = document.getElementById('product-list');

    // Clear any existing content
    productList.innerHTML = '';

    // Loop through each product and create its card
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product');

        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p>${product.description}</p>
            <p><strong>${product.price}</strong></p>
            <button>Add to Cart</button>
        `;

        // Append the product card to the product list
        productList.appendChild(productCard);
    });
}

// Fetch and display products when the page loads
window.addEventListener('DOMContentLoaded', fetchProducts);
