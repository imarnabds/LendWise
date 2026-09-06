const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/microlend';

async function migrateDb() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to ${MONGODB_URI} for Migration`);

    const db = mongoose.connection.db;

    // 1. Migrate Users Roles to UPPERCASE
    const usersCollection = db.collection('users');
    const roleMigrationResult = await usersCollection.updateMany(
      { role: 'lender' },
      { $set: { role: 'LENDER' } }
    );
    const roleMigrationResult2 = await usersCollection.updateMany(
      { role: 'borrower' },
      { $set: { role: 'BORROWER' } }
    );
    console.log(`Migrated user roles to LENDER: ${roleMigrationResult.modifiedCount}`);
    console.log(`Migrated user roles to BORROWER: ${roleMigrationResult2.modifiedCount}`);

    // 2. Migrate Loans: lender -> lenderId
    const loansCollection = db.collection('loans');
    const loansMigrationResult = await loansCollection.updateMany(
      { lender: { $exists: true } },
      { $rename: { 'lender': 'lenderId' } }
    );
    console.log(`Migrated loans 'lender' to 'lenderId': ${loansMigrationResult.modifiedCount}`);

    // Note: borrowerId should ideally be populated if they existed as strings.
    // Since there are no records, this migration is just a placeholder to show the intent.
    // If borrowerName exists, we would need a complex script to map it to a User ObjectId,
    // which requires creating new user documents if they don't exist. For now we just
    // rename the lender field.

    // 3. Migrate Payments: lender -> lenderId, loan -> loanId
    const paymentsCollection = db.collection('payments');
    const paymentsMigrationResultLender = await paymentsCollection.updateMany(
      { lender: { $exists: true } },
      { $rename: { 'lender': 'lenderId' } }
    );
    const paymentsMigrationResultLoan = await paymentsCollection.updateMany(
      { loan: { $exists: true } },
      { $rename: { 'loan': 'loanId' } }
    );
    console.log(`Migrated payments 'lender' to 'lenderId': ${paymentsMigrationResultLender.modifiedCount}`);
    console.log(`Migrated payments 'loan' to 'loanId': ${paymentsMigrationResultLoan.modifiedCount}`);

    console.log('\n--- MIGRATION COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Migration Error:', error);
    process.exit(1);
  }
}

migrateDb();
