const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

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
  const { email, password, name } = parseArgs();

  if (!email || !password) {
    console.error('Usage: node scripts/create_admin.js --email <email> --password <password> [--name <name>]');
    process.exit(1);
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
  await mongoose.connect(mongoURI);

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    console.error('User already exists for email:', normalizedEmail);
    process.exit(1);
  }

  const user = new User({
    name: name || 'Admin',
    email: normalizedEmail,
    password,
    role: 'admin'
  });

  await user.save();
  console.log('Admin created:', user.email);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Create admin failed:', error?.message || error);
  process.exit(1);
});
