/**
 * reconcile_balances.js — Post-migration financial reconciliation.
 *
 * For every non-deleted loan, re-derives the expected remainingBalance
 * by summing its actual Payment records and comparing against the stored value.
 *
 * Prints a summary table and exits with:
 *   0 — clean (all loans reconcile within ±₹0.02 rounding tolerance)
 *   1 — discrepancy found (investigate before starting production)
 *
 * Read-only. Makes no writes.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Loan = require('./models/Loan');
const Payment = require('./models/Payment');
const { roundMoney, calculateSimpleInterest } = require('./utils/money');

const TOLERANCE = 0.02; // ₹0.02 — acceptable floating-point drift

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n=== BALANCE RECONCILIATION REPORT ===\n');

    // Fetch all non-deleted (active/overdue/closed) loans
    const loans = await Loan.find({ deletedAt: null }).lean();
    console.log(`Reconciling ${loans.length} active/closed loan(s)...\n`);

    if (loans.length === 0) {
        console.log('No loans to reconcile.');
        console.log('\n=== RECONCILIATION COMPLETE — VERDICT: CLEAN ===');
        process.exit(0);
    }

    // Aggregate payments per loan (only Completed payments count)
    const paymentAgg = await Payment.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: '$loanId', totalPaid: { $sum: '$amount' } } }
    ]);
    const paidMap = {};
    paymentAgg.forEach(p => { paidMap[p._id.toString()] = p.totalPaid; });

    const rows = [];
    let discrepancies = 0;

    for (const loan of loans) {
        const { totalPayable } = calculateSimpleInterest(
            loan.principalAmount,
            loan.interestRate,
            loan.durationMonths
        );

        const totalPaid        = roundMoney(paidMap[loan._id.toString()] || 0);
        const storedBalance    = roundMoney(loan.remainingBalance);
        const storedPaid       = roundMoney(loan.amountPaid || 0);
        const derivedBalance   = roundMoney(totalPayable - totalPaid);
        const balanceDelta     = Math.abs(storedBalance - derivedBalance);
        const paidDelta        = Math.abs(storedPaid - totalPaid);
        const ok               = balanceDelta <= TOLERANCE && paidDelta <= TOLERANCE;

        if (!ok) discrepancies++;

        rows.push({
            id: loan._id.toString().slice(-8),
            name: loan.borrowerName.padEnd(18).slice(0, 18),
            status: loan.status.padEnd(7),
            totalPayable: `₹${totalPayable}`,
            storedPaid:   `₹${storedPaid}`,
            paymentsPaid: `₹${totalPaid}`,
            storedBal:    `₹${storedBalance}`,
            derivedBal:   `₹${derivedBalance}`,
            balDelta:     roundMoney(balanceDelta),
            ok
        });
    }

    // Print table
    const header = '  ID       NAME               STATUS   totalPayable  stored_paid  payments_paid  stored_bal   derived_bal  Δbal   OK';
    console.log(header);
    console.log('  ' + '─'.repeat(header.length - 2));

    for (const r of rows) {
        const mark = r.ok ? '✅' : '❌';
        console.log(
            `  ${r.id}  ${r.name}  ${r.status}  ${r.totalPayable.padEnd(13)} ${r.storedPaid.padEnd(12)} ${r.paymentsPaid.padEnd(13)} ${r.storedBal.padEnd(12)} ${r.derivedBal.padEnd(12)} ₹${r.balDelta.toFixed(2).padEnd(5)} ${mark}`
        );
    }

    console.log('');

    if (discrepancies === 0) {
        console.log(`✅  All ${loans.length} loan(s) reconcile cleanly (tolerance ±₹${TOLERANCE}).`);
        console.log('\n=== RECONCILIATION COMPLETE — VERDICT: CLEAN — SAFE TO START PRODUCTION ===');
    } else {
        console.log(`❌  ${discrepancies} discrepancy/ies detected. DO NOT start production until resolved.`);
        console.log('\n=== RECONCILIATION COMPLETE — VERDICT: HOLD ===');
    }

    process.exit(discrepancies > 0 ? 1 : 0);
}).catch(err => {
    console.error('Reconciliation failed:', err.message);
    process.exit(1);
});
