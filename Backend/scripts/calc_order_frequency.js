require('dotenv').config();
const { MongoClient } = require('mongodb');

async function migrate() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");
        
        const db = client.db('brush');
        const productsRef = db.collection('products');
        const ordersRef = db.collection('orders');

        // Reset all products to 0 order frequency
        await productsRef.updateMany({}, { $set: { orderFrequency: 0 } });
        console.log("Reset orderFrequency to 0 for all products");

        // Iterate through all orders that are not cancelled
        const orders = await ordersRef.find({ status: { $ne: 'cancelled' } }).toArray();
        console.log(`Found ${orders.length} valid orders to process`);

        for (const order of orders) {
            for (const item of order.items) {
                if (item.productId && item.quantity) {
                    await productsRef.updateOne(
                        { id: item.productId },
                        { $inc: { orderFrequency: item.quantity } }
                    );
                }
            }
        }
        console.log("Order frequencies updated successfully");
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

migrate();
