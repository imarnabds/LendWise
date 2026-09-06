const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/microlend';

async function inspectDb() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to ${MONGODB_URI}`);

    const db = mongoose.connection.db;

    // 1. Inspect Users
    console.log('\n--- USERS ---');
    const usersCollection = db.collection('users');
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Total Users: ${totalUsers}`);

    const roleStats = await usersCollection.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]).toArray();
    console.log('Role distribution:', roleStats);

    // 2. Inspect Loans
    console.log('\n--- LOANS ---');
    const loansCollection = db.collection('loans');
    const totalLoans = await loansCollection.countDocuments();
    console.log(`Total Loans: ${totalLoans}`);

    const loansWithLenderField = await loansCollection.countDocuments({ lender: { $exists: true } });
    const loansWithLenderIdField = await loansCollection.countDocuments({ lenderId: { $exists: true } });
    const loansWithBorrowerName = await loansCollection.countDocuments({ borrowerName: { $exists: true } });
    const loansWithBorrowerId = await loansCollection.countDocuments({ borrowerId: { $exists: true } });
    const loansMissingRelationships = await loansCollection.countDocuments({
      $or: [
        { lender: { $exists: false }, lenderId: { $exists: false } },
        { borrowerName: { $exists: false }, borrowerId: { $exists: false } }
      ]
    });

    console.log(`Loans with legacy 'lender' field: ${loansWithLenderField}`);
    console.log(`Loans with new 'lenderId' field: ${loansWithLenderIdField}`);
    console.log(`Loans with legacy 'borrowerName' field: ${loansWithBorrowerName}`);
    console.log(`Loans with new 'borrowerId' field: ${loansWithBorrowerId}`);
    console.log(`Loans missing basic relationships: ${loansMissingRelationships}`);

    // Sample Loan Structure
    const sampleLoan = await loansCollection.findOne();
    if (sampleLoan) console.log('Sample Loan keys:', Object.keys(sampleLoan));

    // 3. Inspect Payments
    console.log('\n--- PAYMENTS ---');
    const paymentsCollection = db.collection('payments');
    const totalPayments = await paymentsCollection.countDocuments();
    console.log(`Total Payments: ${totalPayments}`);

    const paymentsWithLender = await paymentsCollection.countDocuments({ lender: { $exists: true } });
    const paymentsWithLenderId = await paymentsCollection.countDocuments({ lenderId: { $exists: true } });
    const paymentsWithLoan = await paymentsCollection.countDocuments({ loan: { $exists: true } });
    const paymentsWithLoanId = await paymentsCollection.countDocuments({ loanId: { $exists: true } });

    console.log(`Payments with legacy 'lender' field: ${paymentsWithLender}`);
    console.log(`Payments with new 'lenderId' field: ${paymentsWithLenderId}`);
    console.log(`Payments with legacy 'loan' field: ${paymentsWithLoan}`);
    console.log(`Payments with new 'loanId' field: ${paymentsWithLoanId}`);

    const samplePayment = await paymentsCollection.findOne();
    if (samplePayment) console.log('Sample Payment keys:', Object.keys(samplePayment));

    console.log('\n--- END OF REPORT ---');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectDb();
