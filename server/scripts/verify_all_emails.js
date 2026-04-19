const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const run = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
  await mongoose.connect(mongoURI);

  const result = await User.updateMany({}, { $set: { emailVerified: true } });
  console.log('Email verification updated:', result?.modifiedCount ?? result?.nModified ?? 0);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Update failed:', error?.message || error);
  process.exit(1);
});
