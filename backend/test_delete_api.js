const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Loan = require('./models/Loan');
const User = require('./models/User');
const http = require('http');
require('dotenv').config();

async function testDeleteAPI() {
    await mongoose.connect(process.env.MONGO_URI);
    const u = await User.findOne({ name: 'Arnab Das' });

    // Generate a token directly (bypass login)
    const token = jwt.sign(
        { id: u._id, role: u.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    // Get the first active loan
    const loan = await Loan.findOne({ lender: u._id, status: 'Active' });
    if (!loan) {
        console.log('No active loans found');
        process.exit(1);
    }
    console.log(`Will delete: ${loan.borrowerName} (ID: ${loan._id})`);

    // Call the DELETE endpoint
    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/loans/${loan._id}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
            console.log(`DELETE response: ${res.statusCode} - ${data}`);

            // Now check the DB
            const updated = await Loan.findById(loan._id);
            console.log(`After delete - Status: ${updated?.status}, deletedAt: ${updated?.deletedAt}`);

            // Check history endpoint
            const histReq = http.request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/loans/borrower-history',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }, (res2) => {
                let data2 = '';
                res2.on('data', chunk => data2 += chunk);
                res2.on('end', () => {
                    console.log(`History response: ${res2.statusCode} - ${data2}`);
                    process.exit(0);
                });
            });
            histReq.end();
        });
    });
    req.end();
}
testDeleteAPI();
