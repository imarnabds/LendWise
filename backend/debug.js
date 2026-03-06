const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const Payment = require('./models/Payment');
require('dotenv').config({ path: './.env' });
const fs = require('fs');

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);

    const loans = await Loan.find({ status: { $in: ['Active', 'Overdue'] } });
    const output = [];

    for (const loan of loans) {
        let interest_component = (loan.principalAmount * loan.interestRate / 100) / 12;
        if (!interest_component || isNaN(interest_component)) {
            interest_component = loan.emi || 0;
        }

        const now = new Date();
        const dueDay = parseInt(loan.dueDate);
        const lastDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        if (lastDueDate > now) {
            lastDueDate.setMonth(lastDueDate.getMonth() - 1);
        }

        const cycleStartDate = new Date(lastDueDate);
        cycleStartDate.setDate(cycleStartDate.getDate() - 20);

        const recentPayments = await Payment.find({
            loan: loan._id,
            status: 'Completed'
        }).sort({ paymentDate: -1 });

        let amountPaidThisCycle = 0;
        const paymentsInCycle = [];
        for (const p of recentPayments) {
            const paymentTime = new Date(p.paymentDate).getTime();
            const isInCycle = paymentTime >= cycleStartDate.getTime();
            if (isInCycle) {
                amountPaidThisCycle += p.amount;
                paymentsInCycle.push({ amount: p.amount, date: p.paymentDate });
            }
        }

        const safeAmountPaid = parseFloat(amountPaidThisCycle.toFixed(2));
        const safeInterestComp = parseFloat(interest_component.toFixed(2));

        output.push({
            name: loan.borrowerName,
            principal: loan.principalAmount,
            loan_id: loan._id,
            rate: loan.interestRate,
            interestDue: safeInterestComp,
            paidThisCycle: safeAmountPaid,
            cycleStartDate: cycleStartDate.toISOString(),
            paymentsInCycle,
            allPayments: recentPayments.map(p => p.amount)
        });
    }

    fs.writeFileSync('debug_json.json', JSON.stringify(output, null, 2));
    process.exit(0);
}

debug();
