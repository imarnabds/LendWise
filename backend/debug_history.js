const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const User = require('./models/User');
require('dotenv').config();

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    const arnab = await User.findOne({ name: 'Arnab Das' });

    // Check all loans for this lender
    const allLoans = await Loan.find({ lender: arnab._id });
    console.log('=== All loans for Arnab Das ===');
    allLoans.forEach(l => console.log(`  ${l.borrowerName} - Status: ${l.status} - deletedAt: ${l.deletedAt}`));

    // Check specifically for Deleted ones
    const deleted = await Loan.find({ lender: arnab._id, status: 'Deleted' });
    console.log(`\n=== Deleted loans: ${deleted.length} ===`);
    deleted.forEach(l => console.log(`  ${l.borrowerName} - deletedAt: ${l.deletedAt}`));

    process.exit(0);
}
debug();
