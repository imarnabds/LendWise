const mongoose = require('mongoose');
const Loan = require('./models/Loan');
require('dotenv').config({ path: './.env' });
const fs = require('fs');

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    const loans = await Loan.find({ status: { $in: ['Active', 'Overdue'] } }).sort({ createdAt: -1 });

    const output = loans.map(loan => {
        let interest_component = (loan.principalAmount * loan.interestRate / 100);
        return {
            name: loan.borrowerName,
            principal: loan.principalAmount,
            rate: loan.interestRate,
            calculatedBase: interest_component,
            safeInterestComp: parseFloat(interest_component.toFixed(2))
        };
    });

    fs.writeFileSync('check_out.json', JSON.stringify(output, null, 2));
    process.exit(0);
}

debug();
