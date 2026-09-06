require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lendwise');
  const User = require('../models/User');
  const Loan = require('../models/Loan');
  const Payment = require('../models/Payment');

  // ── Upsert lender ────────────────────────────────────────
  let lender = await User.findOne({ email: 'testlender@lendwise.com' });
  if (!lender) {
    lender = new User({
      name: 'Test Lender',
      email: 'testlender@lendwise.com',
      phone: '9000000001',
      password: 'TestLender@123',
      role: 'LENDER',
      address: '1 Lender Lane, Mumbai',
      authProvider: 'password',
    });
    await lender.save();
    console.log('✅ Created lender: testlender@lendwise.com / TestLender@123');
  } else {
    lender.password = 'TestLender@123';
    await lender.save();
    console.log('🔄 Reset lender: testlender@lendwise.com / TestLender@123');
  }

  // ── Upsert borrower ──────────────────────────────────────
  let borrower = await User.findOne({ email: 'testborrower@lendwise.com' });
  if (!borrower) {
    borrower = new User({
      name: 'Test Borrower',
      email: 'testborrower@lendwise.com',
      phone: '9000000002',
      password: 'TestBorrower@123',
      role: 'BORROWER',
      address: '2 Borrower Street, Delhi',
      authProvider: 'password',
    });
    await borrower.save();
    console.log('✅ Created borrower: testborrower@lendwise.com / TestBorrower@123');
  } else {
    borrower.password = 'TestBorrower@123';
    await borrower.save();
    console.log('🔄 Reset borrower: testborrower@lendwise.com / TestBorrower@123');
  }

  // ── Upsert active loan ───────────────────────────────────
  let loan = await Loan.findOne({ lenderId: lender._id, borrowerId: borrower._id, status: 'Active' });
  if (!loan) {
    const principal = 10000;
    const rate = 12;
    const months = 12;
    const totalInterest = (principal * rate * months) / (12 * 100); // simple interest
    const totalPayable = principal + totalInterest;
    const amountPaid = 2000;
    const remainingBalance = totalPayable - amountPaid;

    loan = await Loan.create({
      lenderId: lender._id,
      borrowerId: borrower._id,
      borrowerName: borrower.name,
      borrowerPhone: borrower.phone,
      borrowerAddress: borrower.address,
      principalAmount: principal,
      interestRate: rate,
      durationMonths: months,
      totalInterest,
      totalPayable,
      amountPaid,
      remainingBalance,
      startDate: new Date('2026-01-01'),
      status: 'Active',
      notes: 'QA Test Loan',
    });

    // Check Payment schema fields
    const paymentFields = Object.keys(Payment.schema.paths);
    console.log('Payment schema fields:', paymentFields.filter(f => !f.startsWith('_') && f !== '__v').join(', '));

    console.log('✅ Created active test loan (₹10,000 @12%, ₹2,000 paid)');
    console.log(`   Loan ID: ${loan._id}`);
  } else {
    console.log(`ℹ️  Active test loan already exists (ID: ${loan._id})`);
  }

  console.log('\n🎯 QA Credentials Ready:');
  console.log('   LENDER  : testlender@lendwise.com  / TestLender@123');
  console.log('   BORROWER: testborrower@lendwise.com / TestBorrower@123');

  await mongoose.connection.close();
}

main().catch(e => { console.error(e); process.exit(1); });
