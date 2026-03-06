const mongoose = require('mongoose');
const Loan = require('./backend/models/Loan');
const Payment = require('./backend/models/Payment');
require('dotenv').config({ path: './backend/.env' });

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const loans = await Loan.find({ status: { $in: ['Active', 'Overdue'] } });
    console.log(`Found ${loans.length} active/overdue loans`);

    for (const loan of loans) {
        console.log(`\nLoan: ${loan.borrowerName}, Principal: ${loan.principalAmount}, Rate: ${loan.interestRate}%, EMI: ${loan.emi}, Due Day: ${loan.dueDate}`);

        let interest_component = (loan.principalAmount * loan.interestRate / 100) / 12;
        if (!interest_component || isNaN(interest_component)) {
            interest_component = loan.emi || 0;
        }
        console.log(`Expected Math Interest: ${interest_component}`);

        const now = new Date();
        const dueDay = parseInt(loan.dueDate);
        const lastDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        if (lastDueDate > now) {
            lastDueDate.setMonth(lastDueDate.getMonth() - 1);
        }

        const cycleStartDate = new Date(lastDueDate);
        cycleStartDate.setDate(cycleStartDate.getDate() - 20); // allow slightly longer grace period

        console.log(`Now: ${now.toISOString()}`);
        console.log(`Last Due Date: ${lastDueDate.toISOString()}`);
        console.log(`Cycle Start Date: ${cycleStartDate.toISOString()}`);

        const recentPayments = await Payment.find({
            loan: loan._id,
            status: 'Completed'
        }).sort({ paymentDate: -1 });

        console.log(`Found ${recentPayments.length} payments`);
        let amountPaidThisCycle = 0;
        for (const p of recentPayments) {
            const paymentTime = new Date(p.paymentDate).getTime();
            const isInCycle = paymentTime >= cycleStartDate.getTime();
            console.log(`  Payment: ${p.amount} on ${p.paymentDate.toISOString()} => In Cycle: ${isInCycle}`);
            if (isInCycle) {
                amountPaidThisCycle += p.amount;
            }
        }

        const safeAmountPaid = parseFloat(amountPaidThisCycle.toFixed(2));
        const safeInterestComp = parseFloat(interest_component.toFixed(2));

        console.log(`Total Paid This Cycle: ${safeAmountPaid}`);
        console.log(`Safe Expected Interest: ${safeInterestComp}`);
        console.log(`Status should be: ${safeAmountPaid >= safeInterestComp ? 'PAID' : (safeAmountPaid > 0 ? 'PARTIAL' : 'OVERDUE/PENDING')}`)
    }

    process.exit(0);
}

debug();
