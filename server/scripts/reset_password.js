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
  const { email, id, password } = parseArgs();

  if (!password || (!email && !id)) {
    console.error('Usage: node scripts/reset_password.js --email <email> --password <newPassword>');
    console.error('   or: node scripts/reset_password.js --id <userId> --password <newPassword>');
    process.exit(1);
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexbuy';
  await mongoose.connect(mongoURI);

  const filter = id ? { _id: id } : { email: String(email).toLowerCase() };
  const user = await User.findOne(filter);
  if (!user) {
    console.error('User not found for:', filter);
    process.exit(1);
  }

  user.password = password;
  user.updatedAt = new Date();
  await user.save();

  console.log('Password reset for:', user.email);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Reset password failed:', error?.message || error);
  process.exit(1);
});
