const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');
const Store = require('../models/Store');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (!key.startsWith('--')) continue;
    const value = args[i + 1];
    result[key.slice(2)] = value;
    i += 1;
  }
  return result;
};

const run = async () => {
  const { storeId } = parseArgs();
  if (!storeId) {
    console.error('Usage: node scripts/add_sample_product.js --storeId <storeId>');
    process.exit(1);
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
  await mongoose.connect(mongoURI);

  const store = await Store.findById(storeId);
  if (!store) {
    console.error('Store not found for id:', storeId);
    process.exit(1);
  }

  const product = new Product({
    storeId: store._id,
    name: 'Organic Avocados',
    description: 'Fresh organic avocados, perfectly ripe and ready to eat.',
    category: 'Fruits',
    price: 250,
    quantity: 80,
    sku: 'FM-AVO-001',
    brand: 'Fresh Mart',
    unit: '200g each',
    origin: 'Nepal',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    ingredients: '100% organic avocados',
    nutrition: 'Healthy fats, fiber, vitamins',
    details: [
      { label: 'Storage', value: 'Keep refrigerated' },
      { label: 'Allergen', value: 'None' }
    ],
    images: [],
    isAvailable: true
  });

  await product.save();
  console.log('Sample product created:', product.name, '->', product._id.toString());
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Add sample product failed:', error?.message || error);
  process.exit(1);
});
