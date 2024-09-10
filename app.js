// Array to hold product data
const products = [
    {
        name: 'Smartphone',
        price: '$299',
        description: 'A powerful smartphone with 6GB RAM and 128GB storage.',
        imageUrl: 'https://via.placeholder.com/200x200?text=Smartphone'
    },
    {
        name: 'Laptop',
        price: '$799',
        description: 'A lightweight laptop with 16GB RAM and 512GB SSD.',
        imageUrl: 'https://via.placeholder.com/200x200?text=Laptop'
    },
    {
        name: 'Headphones',
        price: '$99',
        description: 'Noise-cancelling wireless headphones.',
        imageUrl: 'https://via.placeholder.com/200x200?text=Headphones'
    },
    {
        name: 'Smartwatch',
        price: '$199',
        description: 'A stylish smartwatch with health-tracking features.',
        imageUrl: 'https://via.placeholder.com/200x200?text=Smartwatch'
    }
];

// Function to display products
function displayProducts() {
    const productList = document.getElementById('product-list');

    // Loop through products and create product ca
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

// Call the function to display products on page load
window.onload = displayProducts;
