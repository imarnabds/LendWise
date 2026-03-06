const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const User = require('./models/User');
const Payment = require('./models/Payment');
require('dotenv').config();

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find the first lender (or whichever default user is used)
        const lender = await User.findOne({ role: 'lender' });
        if (!lender) {
            console.error('No lender found in the database. Please create one first.');
            process.exit(1);
        }

        // --- Abhay: 1 month overdue ---
        // Setup: Start date 1 month and 10 days ago. Due date on the 5th (usually).
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        oneMonthAgo.setDate(now.getDate() - 10); // push it back a bit earlier than today's day

        const abhayDueDate = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;

        let abhay = await Loan.findOne({ borrowerName: 'Abhay' });
        if (!abhay) {
            abhay = new Loan({
                lender: lender._id,
                borrowerName: 'Abhay',
                borrowerPhone: '9876543210',
                principalAmount: 10000,
                interestRate: 2,
                startDate: oneMonthAgo,
                durationMonths: 12,
                emi: 1033.33,
                dueDate: abhayDueDate,
                status: 'Active'
            });
            await abhay.save();
            console.log('Created loan for Abhay');
        } else {
            abhay.startDate = oneMonthAgo;
            abhay.dueDate = abhayDueDate;
            await abhay.save();
            console.log('Updated loan for Abhay');
        }


        // --- Vrishank: 2 months overdue ---
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(now.getMonth() - 2);
        twoMonthsAgo.setDate(now.getDate() - 10);

        const vrishankDueDate = now.getDate() < 10 ? `0${now.getDate()}` : `${now.getDate()}`;

        let vrishank = await Loan.findOne({ borrowerName: 'Vrishank' });
        if (!vrishank) {
            vrishank = new Loan({
                lender: lender._id,
                borrowerName: 'Vrishank',
                borrowerPhone: '8765432109',
                principalAmount: 20000,
                interestRate: 3,
                startDate: twoMonthsAgo,
                durationMonths: 12,
                emi: 2166.67,
                dueDate: vrishankDueDate,
                status: 'Active'
            });
            await vrishank.save();
            console.log('Created loan for Vrishank');
        } else {
            vrishank.startDate = twoMonthsAgo;
            vrishank.dueDate = vrishankDueDate;
            await vrishank.save();
            console.log('Updated loan for Vrishank');
        }

        // Cleanup any payments they might have so they show as overdue
        await Payment.deleteMany({ loan: { $in: [abhay._id, vrishank._id] } });
        console.log('Cleared payments for Abhay and Vrishank');

        console.log('Data seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
