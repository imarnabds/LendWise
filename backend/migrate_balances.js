/**
 * One-time migration: Initialize remainingBalance for legacy loans where it is 0
 * and the loan is still in-flight (Active or Overdue).
 *
 * SAFETY GUARD: Only 'Active' and 'Overdue' loans are candidates.
 *   - 'Closed' loans with remainingBalance = 0 are legitimately paid off — DO NOT recalculate.
 *   - 'Deleted' loans are archived — DO NOT touch.
 *
 * Formula: totalPayable = principalAmount + (principalAmount × interestRate/100 × durationMonths/12)
 *
 * Idempotency: Safe to re-run. Loans already migrated will have remainingBalance > 0
 * and will not match the query on subsequent runs.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Loan = require('./models/Loan');
const { roundMoney, calculateSimpleInterest } = require('./utils/money');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n--- MIGRATE BALANCES ---');

    // Only touch Active/Overdue loans with an uninitialized remainingBalance
    // 'Closed' (fully paid) and 'Deleted' (archived) are explicitly excluded
    const candidates = await Loan.find({
        remainingBalance: 0,
        status: { $in: ['Active', 'Overdue'] }
    });

    console.log(`Candidate loans (Active/Overdue, remainingBalance = 0): ${candidates.length}`);

    if (candidates.length === 0) {
        console.log('No migration required — all in-flight loans already have a non-zero balance.');
        process.exit(0);
    }

    let updated = 0;
    for (const loan of candidates) {
        const { totalInterest, totalPayable } = calculateSimpleInterest(
            loan.principalAmount,
            loan.interestRate,
            loan.durationMonths
        );
        const newBalance = roundMoney(totalPayable - (loan.amountPaid || 0));
        console.log(`  ✅ [${loan.status}] ${loan.borrowerName}: ` +
            `totalPayable=₹${totalPayable}, amountPaid=₹${loan.amountPaid || 0}, ` +
            `setting remainingBalance=₹${newBalance}`);
        loan.remainingBalance = newBalance;
        await loan.save();
        updated++;
    }

    console.log(`\nMigration complete. Updated ${updated} loan(s).`);
    process.exit(0);
}).catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
