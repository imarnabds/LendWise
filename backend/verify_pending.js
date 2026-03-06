const mongoose = require('mongoose');
const Loan = require('./models/Loan');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const loans = await Loan.find({ borrowerName: { $in: ['Abhay', 'Vrishank'] } });

        loans.forEach(loan => {
            console.log(`\nName: ${loan.borrowerName}`);
            console.log(`Status: ${loan.status}`);
            console.log(`Start Date: ${loan.startDate}`);
            console.log(`Due Date (day of month): ${loan.dueDate}`);
        });

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
