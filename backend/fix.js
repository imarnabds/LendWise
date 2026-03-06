const mongoose = require('mongoose');
const Loan = require('./models/Loan');
require('dotenv').config({ path: './.env' });

async function fix() {
    await mongoose.connect(process.env.MONGO_URI);
    await Loan.updateOne({ borrowerName: "Ashutosh Ojha" }, { $set: { status: "Active" } });
    console.log("Fixed Ashutosh");
    process.exit(0);
}

fix();
