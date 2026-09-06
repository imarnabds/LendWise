/**
 * Phase 13 — Concurrency & Load Test
 *
 * Tests atomic payment protection under concurrent request load.
 * Uses synthetic test data via Mongoose — never touches real production data.
 *
 * Verifies:
 * 1. No overpayment beyond totalPayable under 10-concurrent-request storm
 * 2. Financial invariant: remainingBalance = totalPayable - amountPaid
 * 3. Closed loan rejects further payments
 * 4. Enhanced /api/health observability schema
 *
 * Pattern: follows the established test pattern (createApp / connectDB /
 * disconnectDB / cleanCollections from setup.js) so no server.listen()
 * is ever called, and supertest uses ephemeral OS-assigned ports.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');

let app;
let lenderUser, borrowerUser;
let lenderToken;
let testLoan;

// Unique phone numbers won't collide with other test suites
const LENDER_PHONE = '9987770001';
const BORROWER_PHONE = '9987770002';

beforeAll(async () => {
    await connectDB();
    app = createApp();

    // Clean up any leftover data from previous runs
    await User.deleteMany({ phone: { $in: [LENDER_PHONE, BORROWER_PHONE] } });

    // Create synthetic lender and borrower directly via Mongoose
    lenderUser = await new User({
        name: 'Conc_Lender',
        phone: LENDER_PHONE,
        password: 'Password123!',
        role: 'LENDER',
        isVerified: true
    }).save();

    borrowerUser = await new User({
        name: 'Conc_Borrower',
        phone: BORROWER_PHONE,
        password: 'Password123!',
        role: 'BORROWER',
        isVerified: true
    }).save();

    // Login lender to get JWT
    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ mobileOrEmail: LENDER_PHONE, password: 'Password123!' });
    expect(loginRes.status).toBe(200);
    lenderToken = loginRes.body.token;
});

afterAll(async () => {
    // Cleanup test data in isolation — don't touch other test suites' data
    if (testLoan?._id) {
        await Payment.deleteMany({ loanId: testLoan._id });
        await Loan.deleteOne({ _id: testLoan._id });
    }
    await User.deleteMany({ phone: { $in: [LENDER_PHONE, BORROWER_PHONE] } });
    await disconnectDB();
});

describe('Phase 13 — Concurrency & Atomic Payment Protection', () => {

    beforeEach(async () => {
        // Start each test with a fresh loan
        if (testLoan?._id) {
            await Payment.deleteMany({ loanId: testLoan._id });
            await Loan.deleteOne({ _id: testLoan._id });
        }

        // Create loan directly via Mongoose (bypasses validator; follows established test pattern)
        testLoan = await new Loan({
            lenderId: lenderUser._id,
            borrowerId: borrowerUser._id,
            borrowerName: borrowerUser.name,
            borrowerPhone: borrowerUser.phone,
            principalAmount: 1000,
            interestRate: 10,
            startDate: new Date(),
            durationMonths: 12,
            totalInterest: 100,
            totalPayable: 1100,
            amountPaid: 0,
            remainingBalance: 1100,
            emi: 91.67,
            status: 'Active'
        }).save();
    });

    test('1. 10 concurrent full-payment requests — atomic protection holds', async () => {
        const exactBalance = testLoan.remainingBalance;

        console.log(`\n  Firing 10 concurrent payments of ₹${exactBalance} against loan ${testLoan._id}`);

        // Fire 10 simultaneous payment requests for the full balance
        const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
            request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: exactBalance,
                    paymentDate: new Date().toISOString().split('T')[0],
                    mode: 'Cash',
                    notes: `Concurrency storm request #${i + 1}`
                })
        );

        const results = await Promise.allSettled(concurrentRequests);
        const responses = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        const successCount = responses.filter(r => r.status === 201).length;
        const rejectCount = responses.filter(r => r.status === 400).length;

        console.log(`  Accepted: ${successCount} | Rejected: ${rejectCount}`);
        console.log(`  Status codes: [${responses.map(r => r.status).join(', ')}]`);

        // INVARIANT: At least one payment must succeed
        expect(successCount).toBeGreaterThanOrEqual(1);

        // INVARIANT: Total amountPaid must never exceed totalPayable
        const finalLoan = await Loan.findById(testLoan._id).lean();
        expect(finalLoan.amountPaid).toBeLessThanOrEqual(finalLoan.totalPayable + 0.01);
        expect(finalLoan.remainingBalance).toBeGreaterThanOrEqual(-0.01);

        console.log(`  Final: amountPaid=${finalLoan.amountPaid}, totalPayable=${finalLoan.totalPayable}, remainingBalance=${finalLoan.remainingBalance}, status=${finalLoan.status}`);
    });

    test('2. Financial invariant: remainingBalance = totalPayable - amountPaid', async () => {
        // Pay a partial amount and verify invariant
        await request(app)
            .post('/api/payments')
            .set('Authorization', `Bearer ${lenderToken}`)
            .send({
                loanId: testLoan._id.toString(),
                amount: 500,
                paymentDate: new Date().toISOString().split('T')[0],
                mode: 'Cash'
            });

        const loan = await Loan.findById(testLoan._id).lean();
        const computed = Math.round((loan.totalPayable - loan.amountPaid) * 100) / 100;
        const stored = Math.round(loan.remainingBalance * 100) / 100;
        expect(stored).toBeCloseTo(computed, 1);
        console.log(`\n  Invariant: remainingBalance(${stored}) ≈ totalPayable(${loan.totalPayable}) - amountPaid(${loan.amountPaid}) = ${computed}`);
    });

    test('3. Exact final payment closes loan; subsequent payment is rejected with 400', async () => {
        const balance = testLoan.remainingBalance;

        // Close the loan with exact balance payment
        const closeRes = await request(app)
            .post('/api/payments')
            .set('Authorization', `Bearer ${lenderToken}`)
            .send({
                loanId: testLoan._id.toString(),
                amount: balance,
                paymentDate: new Date().toISOString().split('T')[0],
                mode: 'Cash'
            });
        expect(closeRes.status).toBe(201);

        // Verify loan is Closed
        const closedLoan = await Loan.findById(testLoan._id).lean();
        expect(closedLoan.status).toBe('Closed');
        expect(closedLoan.remainingBalance).toBeCloseTo(0, 1);

        // Attempt a further payment — must be rejected
        const rejectRes = await request(app)
            .post('/api/payments')
            .set('Authorization', `Bearer ${lenderToken}`)
            .send({
                loanId: testLoan._id.toString(),
                amount: 10,
                paymentDate: new Date().toISOString().split('T')[0],
                mode: 'Cash'
            });
        expect(rejectRes.status).toBe(400);
        console.log(`\n  Post-close payment correctly rejected: ${rejectRes.status} — "${rejectRes.body.message}"`);
    });

    test('4. GET /api/health returns full observability schema', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toMatch(/^(healthy|degraded)$/);
        expect(typeof res.body.uptimeSeconds).toBe('number');
        expect(typeof res.body.version).toBe('string');
        expect(res.body.nodeVersion).toMatch(/^v\d+/);
        expect(res.body.services).toHaveProperty('database');
        expect(res.body.services).toHaveProperty('redis');
        expect(res.body.memory).toHaveProperty('heapUsedMB');
        expect(res.body.memory).toHaveProperty('heapTotalMB');
        expect(res.body.memory).toHaveProperty('rssMB');
        expect(typeof res.body.memory.heapUsedMB).toBe('number');
        expect(res.body.memory.heapUsedMB).toBeGreaterThan(0);

        console.log(`\n  Health: status=${res.body.status}, heap=${res.body.memory.heapUsedMB}MB/${res.body.memory.heapTotalMB}MB, node=${res.body.nodeVersion}, v=${res.body.version}`);
    });
});
