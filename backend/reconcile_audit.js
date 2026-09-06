/**
 * Phase 14 — Financial Reconciliation Audit Script
 *
 * READ-ONLY. Does not modify any data.
 *
 * For every Loan in the database verifies:
 *   remainingBalance = totalPayable - amountPaid (within ±0.01 rounding tolerance)
 *   amountPaid <= totalPayable
 *   remainingBalance >= -0.01
 *
 * Also checks:
 *   - Payment total sums match loan amountPaid
 *   - Orphan loans (missing lender/borrower)
 *   - Orphan payments (missing loan)
 *
 * Usage: node reconcile_audit.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Loan = require('./models/Loan');
const Payment = require('./models/Payment');
const User = require('./models/User');

const round = (n) => Math.round(n * 100) / 100;

async function run() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/microlend';
    await mongoose.connect(uri);
    console.log(`\n✅ Connected to MongoDB: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}\n`);

    // ── 1. Financial Invariant Check ─────────────────────────
    console.log('═══════════════════════════════════════════');
    console.log('1. FINANCIAL INVARIANT CHECK');
    console.log('   remainingBalance = totalPayable - amountPaid');
    console.log('═══════════════════════════════════════════');

    const loans = await Loan.find({}).lean();
    let invariantPass = 0, invariantFail = 0, negativeBalance = 0, overpayment = 0;
    const discrepancies = [];

    for (const loan of loans) {
        const expected = round(loan.totalPayable - loan.amountPaid);
        const stored = round(loan.remainingBalance);
        const diff = Math.abs(stored - expected);

        if (diff > 0.01) {
            invariantFail++;
            discrepancies.push({
                loanId: loan._id,
                status: loan.status,
                totalPayable: loan.totalPayable,
                amountPaid: loan.amountPaid,
                remainingBalance: loan.remainingBalance,
                expected,
                diff
            });
        } else {
            invariantPass++;
        }

        if (loan.remainingBalance < -0.01) {
            negativeBalance++;
        }

        if (round(loan.amountPaid) > round(loan.totalPayable) + 0.01) {
            overpayment++;
        }
    }

    console.log(`   Total loans checked: ${loans.length}`);
    console.log(`   ✅ Invariant PASS:  ${invariantPass}`);
    console.log(`   ❌ Invariant FAIL:  ${invariantFail}`);
    console.log(`   ⚠️  Negative balance: ${negativeBalance}`);
    console.log(`   ⚠️  Overpayment:     ${overpayment}`);

    if (discrepancies.length > 0) {
        console.log('\n   DISCREPANCIES:');
        discrepancies.forEach(d => {
            console.log(`   Loan ${d.loanId}: stored=${d.remainingBalance} expected=${d.expected} diff=${d.diff} status=${d.status}`);
        });
    }

    // ── 2. Payment Ledger Reconciliation ─────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('2. PAYMENT LEDGER RECONCILIATION');
    console.log('   SUM(payments) vs loan.amountPaid');
    console.log('═══════════════════════════════════════════');

    let ledgerPass = 0, ledgerFail = 0;
    const ledgerDiscrepancies = [];

    for (const loan of loans) {
        const payments = await Payment.find({ loanId: loan._id, status: 'Completed' }).lean();
        const paymentTotal = round(payments.reduce((sum, p) => sum + p.amount, 0));
        const storedAmountPaid = round(loan.amountPaid);

        if (Math.abs(paymentTotal - storedAmountPaid) > 0.01) {
            ledgerFail++;
            ledgerDiscrepancies.push({
                loanId: loan._id,
                paymentTotal,
                storedAmountPaid,
                diff: Math.abs(paymentTotal - storedAmountPaid)
            });
        } else {
            ledgerPass++;
        }
    }

    console.log(`   Total loans reconciled: ${loans.length}`);
    console.log(`   ✅ Ledger PASS:  ${ledgerPass}`);
    console.log(`   ❌ Ledger FAIL:  ${ledgerFail}`);

    if (ledgerDiscrepancies.length > 0) {
        console.log('\n   LEDGER DISCREPANCIES:');
        ledgerDiscrepancies.forEach(d => {
            console.log(`   Loan ${d.loanId}: payments=${d.paymentTotal} stored=${d.storedAmountPaid} diff=${d.diff}`);
        });
    }

    // ── 3. Orphan Data Check ─────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('3. ORPHAN DATA CHECK');
    console.log('═══════════════════════════════════════════');

    const payments = await Payment.find({}).lean();
    let orphanPayments = 0;
    for (const payment of payments) {
        const loan = await Loan.findById(payment.loanId).lean();
        if (!loan) {
            orphanPayments++;
            console.log(`   ⚠️  Orphan payment ${payment._id} references missing loan ${payment.loanId}`);
        }
    }

    let orphanLoans = 0;
    for (const loan of loans) {
        const lender = await User.findById(loan.lenderId).lean();
        const borrower = await User.findById(loan.borrowerId).lean();
        if (!lender || !borrower) {
            orphanLoans++;
            console.log(`   ⚠️  Loan ${loan._id} references missing user (lender=${!lender ? 'MISSING' : 'OK'}, borrower=${!borrower ? 'MISSING' : 'OK'})`);
        }
    }

    if (orphanPayments === 0 && orphanLoans === 0) {
        console.log('   ✅ No orphan records found');
    }

    // ── 4. Status Sanity ─────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('4. LOAN STATUS SANITY');
    console.log('═══════════════════════════════════════════');

    const statusCounts = {};
    let statusMismatch = 0;
    for (const loan of loans) {
        statusCounts[loan.status] = (statusCounts[loan.status] || 0) + 1;
        // Closed loans should have 0 remaining balance
        if (loan.status === 'Closed' && round(loan.remainingBalance) > 0.01) {
            statusMismatch++;
            console.log(`   ⚠️  Closed loan ${loan._id} has remainingBalance=${loan.remainingBalance}`);
        }
        // Active/Overdue loans should have positive remaining balance
        if ((loan.status === 'Active' || loan.status === 'Overdue') && round(loan.remainingBalance) < -0.01) {
            statusMismatch++;
            console.log(`   ⚠️  ${loan.status} loan ${loan._id} has negative remainingBalance=${loan.remainingBalance}`);
        }
    }

    console.log('   Status distribution:');
    Object.entries(statusCounts).forEach(([s, c]) => console.log(`     ${s}: ${c}`));
    if (statusMismatch === 0) {
        console.log('   ✅ All statuses are consistent with balances');
    } else {
        console.log(`   ❌ ${statusMismatch} status mismatches found`);
    }

    // ── Summary ──────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════');
    console.log('RECONCILIATION SUMMARY');
    console.log('═══════════════════════════════════════════');

    const isClean = invariantFail === 0 && ledgerFail === 0 && orphanPayments === 0 && orphanLoans === 0 && statusMismatch === 0;

    console.log(`   Total Loans:     ${loans.length}`);
    console.log(`   Total Payments:  ${payments.length}`);
    console.log(`   Total Users:     ${await User.countDocuments()}`);
    console.log(`   Invariant issues: ${invariantFail}`);
    console.log(`   Ledger issues:    ${ledgerFail}`);
    console.log(`   Orphan records:   ${orphanPayments + orphanLoans}`);
    console.log(`   Status mismatches: ${statusMismatch}`);
    console.log('');
    if (isClean) {
        console.log('   ✅ RECONCILIATION CLEAN — No financial discrepancies found');
    } else {
        console.log('   ❌ RECONCILIATION ISSUES FOUND — Review above for details');
    }

    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed.\n');
    process.exit(isClean ? 0 : 1);
}

run().catch(err => {
    console.error('Reconciliation script error:', err.message);
    process.exit(1);
});
