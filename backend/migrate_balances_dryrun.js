/**
 * DRY-RUN: migrate_balances — reads only, makes NO writes.
 *
 * Outputs exactly what migrate_balances.js would change so operators
 * can verify correctness before committing the real migration.
 *
 * Safe to run as many times as needed — zero side effects.
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Loan = require('./models/Loan');
const { roundMoney, calculateSimpleInterest } = require('./utils/money');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');
    console.log('\n=== DRY-RUN: migrate_balances (NO WRITES WILL OCCUR) ===\n');

    const db = mongoose.connection.db;
    const loansCollection = db.collection('loans');

    // ── Counts by status for full situational awareness ──────────────────
    const totalLoans      = await loansCollection.countDocuments();
    const activeLoans     = await loansCollection.countDocuments({ status: 'Active' });
    const overdueLoans    = await loansCollection.countDocuments({ status: 'Overdue' });
    const closedLoans     = await loansCollection.countDocuments({ status: 'Closed' });
    const deletedLoans    = await loansCollection.countDocuments({ status: 'Deleted' });
    const softDeleted     = await loansCollection.countDocuments({ deletedAt: { $ne: null } });

    // Breakdown of zero-balance records by status (the key safety check)
    const zeroBalTotal    = await loansCollection.countDocuments({ remainingBalance: 0 });
    const zeroBalClosed   = await loansCollection.countDocuments({ remainingBalance: 0, status: 'Closed' });
    const zeroBalDeleted  = await loansCollection.countDocuments({ remainingBalance: 0, status: 'Deleted' });
    const zeroBalActive   = await loansCollection.countDocuments({ remainingBalance: 0, status: 'Active' });
    const zeroBalOverdue  = await loansCollection.countDocuments({ remainingBalance: 0, status: 'Overdue' });

    console.log('── Loan Inventory ──────────────────────────────────');
    console.log(`  Total Loans:                  ${totalLoans}`);
    console.log(`  Active:                       ${activeLoans}`);
    console.log(`  Overdue:                      ${overdueLoans}`);
    console.log(`  Closed:                       ${closedLoans}`);
    console.log(`  Status=Deleted:               ${deletedLoans}`);
    console.log(`  Soft-deleted (deletedAt!=null): ${softDeleted}`);
    console.log('');
    console.log('── Zero-Balance Breakdown ──────────────────────────');
    console.log(`  Total with remainingBalance=0:    ${zeroBalTotal}`);
    console.log(`  → Closed  (safe to SKIP):         ${zeroBalClosed}`);
    console.log(`  → Deleted (safe to SKIP):         ${zeroBalDeleted}`);
    console.log(`  → Active  (migration candidates): ${zeroBalActive}`);
    console.log(`  → Overdue (migration candidates): ${zeroBalOverdue}`);
    console.log('');

    // ── Actual candidates the real migration would touch ─────────────────
    const candidates = await Loan.find({
        remainingBalance: 0,
        status: { $in: ['Active', 'Overdue'] }
    });

    if (candidates.length === 0) {
        console.log('✅  No migration candidates found.');
        console.log('    migrate_balances.js would exit with "No migration required".');
        console.log('\n=== DRY-RUN COMPLETE — VERDICT: MIGRATION WOULD BE A NO-OP ===');
        process.exit(0);
    }

    console.log(`Migration candidates (would be updated): ${candidates.length}`);
    console.log('');

    let anomalies = 0;

    for (const loan of candidates) {
        const { totalPayable } = calculateSimpleInterest(
            loan.principalAmount,
            loan.interestRate,
            loan.durationMonths
        );
        const expectedBalance = roundMoney(totalPayable - (loan.amountPaid || 0));
        const isAnomaly = expectedBalance < 0;

        const flag = isAnomaly ? '⚠️  ANOMALY' : '→';
        console.log(`  ${flag} [${loan.status}] ${loan.borrowerName}`);
        console.log(`       _id:               ${loan._id}`);
        console.log(`       principal:         ₹${loan.principalAmount}`);
        console.log(`       interestRate:      ${loan.interestRate}%`);
        console.log(`       durationMonths:    ${loan.durationMonths}`);
        console.log(`       totalPayable:      ₹${totalPayable}`);
        console.log(`       amountPaid:        ₹${loan.amountPaid || 0}`);
        console.log(`       current balance:   ₹${loan.remainingBalance}`);
        console.log(`       would set balance: ₹${expectedBalance}`);
        console.log('');

        if (isAnomaly) anomalies++;
    }

    if (anomalies > 0) {
        console.log(`⚠️  ANOMALIES: ${anomalies} loan(s) would produce a negative balance.`);
        console.log('    DO NOT run the real migration until these are investigated.');
        console.log('\n=== DRY-RUN COMPLETE — VERDICT: HOLD — REVIEW ANOMALIES ===');
    } else {
        console.log(`✅  No anomalies. All ${candidates.length} candidate(s) produce valid balances.`);
        console.log('\n=== DRY-RUN COMPLETE — VERDICT: SAFE TO MIGRATE ===');
    }

    process.exit(anomalies > 0 ? 1 : 0);
}).catch(err => {
    console.error('Dry-run failed:', err.message);
    process.exit(1);
});
