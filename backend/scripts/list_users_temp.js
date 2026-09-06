require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lendwise');
  const User = require('../models/User');
  const users = await User.find({}, { email: 1, role: 1, name: 1, createdAt: 1, mobile: 1 })
    .sort({ createdAt: 1 })
    .limit(15);
  console.log(JSON.stringify(users, null, 2));

  // Also check total counts
  const lenderCount = await User.countDocuments({ role: 'LENDER' });
  const borrowerCount = await User.countDocuments({ role: 'BORROWER' });
  console.log(`\nTotal: ${lenderCount} lenders, ${borrowerCount} borrowers`);

  await mongoose.connection.close();
}

main().catch(e => { console.error(e); process.exit(1); });
