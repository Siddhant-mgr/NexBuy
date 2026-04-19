const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
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

const randomToken = (len = 8) => Math.random().toString(36).slice(2, 2 + len);

const run = async () => {
  const args = parseArgs();
  const lat = Number(args.lat);
  const lng = Number(args.lng);
  const delta = Number(args.delta ?? 0.05);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error('Usage: node scripts/create_seller_store.js --lat <lat> --lng <lng> [--delta <offset>]');
    process.exit(1);
  }

  const storeLat = lat + delta;
  const storeLng = lng + delta;

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
  await mongoose.connect(mongoURI);

  const suffix = `${Date.now()}${randomToken(4)}`;
  const sellerName = `Auto Seller ${suffix}`;
  const sellerEmail = `autoseller_${suffix}@nexbuy.local`;
  const sellerPassword = `Sell${randomToken(8)}!`;

  const user = new User({
    name: sellerName,
    email: sellerEmail,
    password: sellerPassword,
    role: 'seller',
    emailVerified: true,
    sellerVerificationStatus: 'approved',
    sellerIsVerified: true,
    sellerApprovedAt: new Date()
  });

  await user.save();

  const store = new Store({
    sellerId: user._id,
    storeName: `Farther Mart ${suffix}`,
    description: 'Auto-generated store for navigation testing.',
    category: 'General',
    location: {
      type: 'Point',
      coordinates: [storeLng, storeLat]
    },
    address: {
      fullAddress: `Test location near ${storeLat.toFixed(5)}, ${storeLng.toFixed(5)}`
    },
    contact: {
      email: sellerEmail
    },
    storeVerificationStatus: 'approved',
    isActive: true
  });

  await store.save();

  console.log('Seller created:', sellerEmail);
  console.log('Seller password:', sellerPassword);
  console.log('Store created:', store.storeName);
  console.log('Store coordinates:', `${storeLat.toFixed(6)}, ${storeLng.toFixed(6)}`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Create seller/store failed:', error?.message || error);
  process.exit(1);
});
