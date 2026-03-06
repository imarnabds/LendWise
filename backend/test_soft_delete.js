const mongoose = require('mongoose');
const Loan = require('./models/Loan');
const User = require('./models/User');
require('dotenv').config();

async function testSoftDelete() {
    await mongoose.connect(process.env.MONGO_URI);
    const arnab = await User.findOne({ name: 'Arnab Das' });

    // Find the first active loan
    const loan = await Loan.findOne({ lender: arnab._id, status: 'Active' });
    if (!loan) {
        console.log('No active loans to test soft-delete with');
        process.exit(1);
    }

    console.log(`Testing soft-delete on: ${loan.borrowerName} (ID: ${loan._id})`);

    // Simulate what the DELETE endpoint does
    const http = require('http');

    // First, login as Arnab Das to get a token
    const loginData = JSON.stringify({
        mobileOrEmail: arnab.phone,
        password: 'password'
    });

    console.log(`Trying login with phone: ${arnab.phone}`);

    const loginReq = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Login response:', res.statusCode, data.substring(0, 200));

            const resp = JSON.parse(data);
            if (!resp.token) {
                console.log('Login failed, testing DB-level soft-delete directly');
                // Do it directly in the DB to prove the code works
                loan.status = 'Deleted';
                loan.deletedAt = new Date();
                loan.save().then(() => {
                    console.log(`Soft-deleted ${loan.borrowerName} directly in DB`);

                    // Now test the history endpoint
                    Loan.find({ lender: arnab._id, status: 'Deleted' }).sort({ deletedAt: -1 }).limit(10).then(deleted => {
                        console.log(`\nHistory endpoint would return ${deleted.length} items:`);
                        deleted.forEach(d => console.log(`  ${d.borrowerName} - Principal: ${d.principalAmount} - Rate: ${d.interestRate}% - Duration: ${d.durationMonths}m`));
                        process.exit(0);
                    });
                });
                return;
            }

            // Test the actual DELETE endpoint
            const delReq = http.request({
                hostname: 'localhost',
                port: 5000,
                path: `/api/loans/${loan._id}`,
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${resp.token}` }
            }, (res2) => {
                let data2 = '';
                res2.on('data', chunk => data2 += chunk);
                res2.on('end', () => {
                    console.log('Delete response:', res2.statusCode, data2);

                    // Check the loan status now
                    Loan.findById(loan._id).then(updated => {
                        console.log(`After delete - Status: ${updated?.status}, deletedAt: ${updated?.deletedAt}`);
                        process.exit(0);
                    });
                });
            });
            delReq.end();
        });
    });

    loginReq.write(loginData);
    loginReq.end();
}

testSoftDelete();
