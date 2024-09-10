// Function to fetch products from the server
async function fetchProducts() {
    try {
        const response = await fetch('http://localhost:5000/products');
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Function to display products
function displayProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = ''; // Clear the existing content

    // Loop through products and create product cards
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product');

        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p>${product.description}</p>
            <p><strong>$${product.price}</strong></p>
            <button>Add to Cart</button>
        `;

        // Append the product card to the product list
        productList.appendChild(productCard);
    });
}

// Call the function to fetch and display products on page load
window.onload = fetchProducts;
