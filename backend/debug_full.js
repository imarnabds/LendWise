const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const User = require('./models/User');
require('dotenv').config();

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    const u = await User.findOne({ name: 'Arnab Das' });
    const all = await Loan.find({ lender: u._id });
    console.log(`Total loans for Arnab Das: ${all.length}`);
    all.forEach(l => {
        console.log(`  Name: ${l.borrowerName} | Status: ${l.status} | deletedAt: ${l.deletedAt}`);
    });

    console.log('\n--- Deleted loans only ---');
    const deleted = await Loan.find({ lender: u._id, status: 'Deleted' });
    console.log(`Count: ${deleted.length}`);
    deleted.forEach(l => console.log(`  ${l.borrowerName}`));

    process.exit(0);
}
debug();
