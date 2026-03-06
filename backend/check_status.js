const mongoose = require('mongoose');
const Loan = require('./models/Loan');
require('dotenv').config({ path: './.env' });
const fs = require('fs');

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    const loans = await Loan.find({}).sort({ createdAt: -1 });
    const output = loans.map(l => ({ name: l.borrowerName, status: l.status }));
    fs.writeFileSync('db_status.json', JSON.stringify(output, null, 2));
    process.exit(0);
}

debug();
