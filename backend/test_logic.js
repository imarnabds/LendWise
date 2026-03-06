const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const Payment = require('./models/Payment');
const User = require('./models/User');
require('dotenv').config();

async function runPendingLogic() {
    await mongoose.connect(process.env.MONGO_URI);
    const lender = await User.findOne({ email: 'test@microlend.com' });

    const filter = { lender: lender._id, status: { $in: ['Active', 'Overdue'] } };
    const loans = await Loan.find(filter).sort({ status: 1, createdAt: -1 });

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 45);
    const recentPayments = await Payment.find({
        lender: lender._id,
        status: 'Completed',
        paymentDate: { $gte: recentDate }
    });

    const now = new Date();
    const pendingList = loans.map(loan => {
        const dueDay = parseInt(loan.dueDate);
        const lastDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        if (lastDueDate > now) {
            lastDueDate.setMonth(lastDueDate.getMonth() - 1);
        }
        const daysLate = Math.max(0, Math.floor((now - lastDueDate) / (1000 * 60 * 60 * 24)));

        const cycleStartDate = new Date(lastDueDate);
        cycleStartDate.setDate(cycleStartDate.getDate() - 20);

        let amountPaidThisCycle = 0;
        recentPayments.forEach(p => {
            const paymentTime = new Date(p.paymentDate).getTime();
            if (p.loan.toString() === loan._id.toString() && paymentTime >= cycleStartDate.getTime()) {
                amountPaidThisCycle += p.amount;
            }
        });

        let interest_component = (loan.principalAmount * loan.interestRate / 100);
        if (!interest_component || isNaN(interest_component)) {
            interest_component = loan.emi || 0;
        }

        const safeAmountPaid = parseFloat(amountPaidThisCycle.toFixed(2));
        const safeInterestComp = parseFloat(interest_component.toFixed(2));

        let severity = 'PENDING';
        if (safeAmountPaid >= safeInterestComp) {
            severity = 'PAID';
        } else if (safeAmountPaid > 0 && safeAmountPaid < safeInterestComp) {
            severity = 'PARTIAL';
        } else if (lastDueDate.getTime() < now.getTime() && safeAmountPaid < safeInterestComp) {
            severity = 'OVERDUE';
        }

        return {
            name: loan.borrowerName,
            daysLate,
            status: severity,
            dueDate: lastDueDate.toISOString().split('T')[0]
        };
    });

    console.log('--- API Output Replica ---');
    pendingList.forEach(p => console.log(p));
    process.exit(0);
}

runPendingLogic();
