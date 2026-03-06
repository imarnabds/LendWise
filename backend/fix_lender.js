const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const User = require('./models/User');
require('dotenv').config();

async function fixLender() {
    await mongoose.connect(process.env.MONGO_URI);
    const arnab = await User.findOne({ name: 'Arnab Das' });
    if (!arnab) {
        console.error('Arnab Das not found!');
        process.exit(1);
    }
    console.log('Found Arnab Das:', arnab._id.toString());

    const result = await Loan.updateMany(
        { borrowerName: { $in: ['Abhay', 'Vrishank'] } },
        { lender: arnab._id }
    );
    console.log('Updated', result.modifiedCount, 'loans to Arnab Das');

    // Verify
    const loans = await Loan.find({ lender: arnab._id, status: { $in: ['Active', 'Overdue'] } });
    console.log('Active/Overdue loans for Arnab Das:');
    loans.forEach(l => console.log(`  ${l.borrowerName} - Status: ${l.status} - Due: ${l.dueDate}`));

    process.exit(0);
}
fixLender();
