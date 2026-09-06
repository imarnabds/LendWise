const request = require('supertest');
const mongoose = require('mongoose');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const redisConfig = require('../config/redis');

let app, lenderTokenA, lenderTokenB, borrowerTokenE, borrowerTokenF;
let lenderUserA, lenderUserB, borrowerUserE, borrowerUserF;
let testLoan;

beforeAll(async () => {
    await connectDB();
    app = createApp();

    await cleanCollections('users', 'loans', 'payments');

    // Create Users for IDOR & authorization matrix:
    // Lender A, Lender B, Borrower E, Borrower F
    lenderUserA = await new User({
        name: 'LenderA',
        phone: '1111111111',
        email: 'lendera@test.com',
        password: 'password123',
        role: 'LENDER',
        isVerified: true
    }).save();

    lenderUserB = await new User({
        name: 'LenderB',
        phone: '2222222222',
        email: 'lenderb@test.com',
        password: 'password123',
        role: 'LENDER',
        isVerified: true
    }).save();

    borrowerUserE = await new User({
        name: 'BorrowerE',
        phone: '3333333333',
        email: 'borrowere@test.com',
        password: 'password123',
        role: 'BORROWER',
        isVerified: true
    }).save();

    borrowerUserF = await new User({
        name: 'BorrowerF',
        phone: '4444444444',
        email: 'borrowerf@test.com',
        password: 'password123',
        role: 'BORROWER',
        isVerified: true
    }).save();

    // Logins
    let res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '1111111111', password: 'password123' });
    lenderTokenA = res.body.token;

    res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '2222222222', password: 'password123' });
    lenderTokenB = res.body.token;

    res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '3333333333', password: 'password123' });
    borrowerTokenE = res.body.token;

    res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '4444444444', password: 'password123' });
    borrowerTokenF = res.body.token;
});

afterAll(async () => {
    await cleanCollections('users', 'loans', 'payments');
    await disconnectDB();
});

describe('Phase 4 — Payment & Financial Engine Test Suite', () => {

    beforeEach(async () => {
        await cleanCollections('loans', 'payments');

        // Standard test loan (Total Payable = 50,000)
        testLoan = new Loan({
            lenderId: lenderUserA._id,
            borrowerId: borrowerUserE._id,
            borrowerName: borrowerUserE.name,
            borrowerPhone: borrowerUserE.phone,
            principalAmount: 45000,
            interestRate: 11.111,
            startDate: new Date(),
            durationMonths: 12,
            totalInterest: 5000,
            totalPayable: 50000,
            amountPaid: 0,
            remainingBalance: 50000,
            emi: 4166.67,
            status: 'Active'
        });
        await testLoan.save();
    });

    describe('1. Financial Test Matrix', () => {

        it('A. Normal Payment: ₹5,000 payment on ₹50,000 balance -> amountPaid=5000, remaining=45000, 1 payment record', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01',
                    mode: 'UPI'
                });

            expect(res.status).toBe(201);
            expect(res.body.updatedBalance).toBe(45000);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(5000);
            expect(dbLoan.remainingBalance).toBe(45000);
            expect(dbLoan.remainingBalance).toBe(dbLoan.totalPayable - dbLoan.amountPaid);

            const payments = await Payment.find({ loanId: testLoan._id });
            expect(payments.length).toBe(1);
            expect(payments[0].amount).toBe(5000);
        });

        it('B. Exact Final Payment: ₹5,000 payment on ₹5,000 balance -> amountPaid=totalPayable, remaining=0, status=Closed', async () => {
            testLoan.amountPaid = 45000;
            testLoan.remainingBalance = 5000;
            await testLoan.save();

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(201);
            expect(res.body.updatedBalance).toBe(0);
            expect(res.body.loanStatus).toBe('Closed');

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(50000);
            expect(dbLoan.remainingBalance).toBe(0);
            expect(dbLoan.status).toBe('Closed');
        });

        it('C. Overpayment: Attempt ₹5,001 on ₹5,000 balance -> 400 Bad Request, loan unchanged, 0 payments created', async () => {
            testLoan.amountPaid = 45000;
            testLoan.remainingBalance = 5000;
            await testLoan.save();

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5001,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(400);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(45000);
            expect(dbLoan.remainingBalance).toBe(5000);

            const count = await Payment.countDocuments({ loanId: testLoan._id });
            expect(count).toBe(0);
        });

        it('D. Zero Payment: amount = 0 -> 400 Bad Request, no state mutation', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 0,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(400);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(0);
            expect(dbLoan.remainingBalance).toBe(50000);
        });

        it('E. Negative Payment: amount = -1 -> 400 Bad Request, no state mutation', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: -1,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(400);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(0);
            expect(dbLoan.remainingBalance).toBe(50000);
        });

        it('F. Invalid Numeric Values: NaN, Infinity, non-numeric string, null, undefined -> 400 Bad Request', async () => {
            const invalidAmounts = [NaN, Infinity, -Infinity, 'invalid-string', '', null, undefined];

            for (const val of invalidAmounts) {
                const res = await request(app)
                    .post('/api/payments')
                    .set('Authorization', `Bearer ${lenderTokenA}`)
                    .send({
                        loanId: testLoan._id.toString(),
                        amount: val,
                        paymentDate: '2026-03-01'
                    });

                expect(res.status).toBe(400);
            }

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(0);
            expect(dbLoan.remainingBalance).toBe(50000);
        });

        it('G. Soft-Deleted Loan: deletedAt != null -> 400 Bad Request, payment blocked', async () => {
            testLoan.deletedAt = new Date();
            await testLoan.save();

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/soft-deleted or archived loan/i);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(0);
            expect(dbLoan.remainingBalance).toBe(50000);
        });

        it('H. Closed Loan: Payment against fully paid/closed loan -> 400 Bad Request', async () => {
            testLoan.amountPaid = 50000;
            testLoan.remainingBalance = 0;
            testLoan.status = 'Closed';
            await testLoan.save();

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 1000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already fully paid and closed/i);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(50000);
            expect(dbLoan.remainingBalance).toBe(0);
        });
    });

    describe('2. Payment Authorization & Single Payment Detail IDOR Matrix', () => {

        let loan1, loan2, loan3, payment1;

        beforeEach(async () => {
            // Loan 1: Lender A -> Borrower E
            loan1 = new Loan({
                lenderId: lenderUserA._id,
                borrowerId: borrowerUserE._id,
                borrowerName: borrowerUserE.name,
                borrowerPhone: borrowerUserE.phone,
                principalAmount: 10000,
                interestRate: 10,
                startDate: new Date(),
                durationMonths: 6,
                totalInterest: 1000,
                totalPayable: 11000,
                amountPaid: 0,
                remainingBalance: 11000,
                status: 'Active'
            });
            await loan1.save();

            // Loan 2: Lender B -> Borrower E
            loan2 = new Loan({
                lenderId: lenderUserB._id,
                borrowerId: borrowerUserE._id,
                borrowerName: borrowerUserE.name,
                borrowerPhone: borrowerUserE.phone,
                principalAmount: 20000,
                interestRate: 10,
                startDate: new Date(),
                durationMonths: 6,
                totalInterest: 2000,
                totalPayable: 22000,
                amountPaid: 0,
                remainingBalance: 22000,
                status: 'Active'
            });
            await loan2.save();

            // Loan 3: Lender A -> Borrower F
            loan3 = new Loan({
                lenderId: lenderUserA._id,
                borrowerId: borrowerUserF._id,
                borrowerName: borrowerUserF.name,
                borrowerPhone: borrowerUserF.phone,
                principalAmount: 15000,
                interestRate: 10,
                startDate: new Date(),
                durationMonths: 6,
                totalInterest: 1500,
                totalPayable: 16500,
                amountPaid: 0,
                remainingBalance: 16500,
                status: 'Active'
            });
            await loan3.save();

            // Record payment on Loan 1
            payment1 = new Payment({
                loanId: loan1._id,
                lenderId: loan1.lenderId,
                borrowerId: loan1.borrowerId,
                borrowerName: loan1.borrowerName,
                amount: 3000,
                principalPortion: 3000,
                interestPortion: 0,
                paymentDate: new Date(),
                mode: 'UPI',
                status: 'Completed'
            });
            await payment1.save();
        });

        it('Authorized: Lender A -> Payment on Loan 1 returns 200 OK', async () => {
            const res = await request(app)
                .get(`/api/payments/${payment1._id}`)
                .set('Authorization', `Bearer ${lenderTokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.payment._id.toString()).toBe(payment1._id.toString());
        });

        it('Authorized: Borrower E -> Payment on Loan 1 returns 200 OK', async () => {
            const res = await request(app)
                .get(`/api/payments/${payment1._id}`)
                .set('Authorization', `Bearer ${borrowerTokenE}`);

            expect(res.status).toBe(200);
            expect(res.body.payment._id.toString()).toBe(payment1._id.toString());
        });

        it('Unauthorized: Lender B -> Payment on Loan 1 returns 403 Forbidden', async () => {
            const res = await request(app)
                .get(`/api/payments/${payment1._id}`)
                .set('Authorization', `Bearer ${lenderTokenB}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/not a party to the loan/i);
        });

        it('Unauthorized: Borrower F -> Payment on Loan 1 returns 403 Forbidden', async () => {
            const res = await request(app)
                .get(`/api/payments/${payment1._id}`)
                .set('Authorization', `Bearer ${borrowerTokenF}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/not a party to the loan/i);
        });
    });

    describe('3. Forged Relationship / IDOR Security Tests', () => {

        it('should reject payment with forged lenderId/borrowerId in request body', async () => {
            // Attempt to forge lenderId/borrowerId to bypass check as Lender B
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenB}`)
                .send({
                    loanId: testLoan._id.toString(),
                    lenderId: lenderUserB._id.toString(),
                    borrowerId: borrowerUserE._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/not a party to this loan/i);

            // Verify payment record in DB uses authoritative Loan relationship, not body values
            const count = await Payment.countDocuments({ loanId: testLoan._id });
            expect(count).toBe(0);
        });
    });

    describe('4. Payment Immutability & Mass Assignment', () => {

        it('should prevent client payload from overriding authoritative Loan financial fields', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01',
                    amountPaid: 999999,
                    remainingBalance: 0,
                    totalPayable: 1
                });

            expect(res.status).toBe(201);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan.amountPaid).toBe(5000);
            expect(dbLoan.remainingBalance).toBe(45000);
            expect(dbLoan.totalPayable).toBe(50000);
        });

        it('should reject PUT / DELETE endpoints on historical payments (immutability)', async () => {
            const payRes = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01'
                });

            const paymentId = payRes.body.payment._id;

            const putRes = await request(app)
                .put(`/api/payments/${paymentId}`)
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({ amount: 100 });

            expect(putRes.status).toBe(404);

            const deleteRes = await request(app)
                .delete(`/api/payments/${paymentId}`)
                .set('Authorization', `Bearer ${lenderTokenA}`);

            expect(deleteRes.status).toBe(404);
        });
    });

    describe('5. Multi-Request Concurrency Testing Matrix', () => {

        it('Scenario A: ₹10,000 balance with 2 concurrent ₹7,000 requests -> 1 success, 1 failure, final balance = 3000', async () => {
            const smallLoan = await new Loan({
                lenderId: lenderUserA._id,
                borrowerId: borrowerUserE._id,
                borrowerName: borrowerUserE.name,
                borrowerPhone: borrowerUserE.phone,
                principalAmount: 10000,
                interestRate: 0,
                startDate: new Date(),
                durationMonths: 1,
                totalInterest: 0,
                totalPayable: 10000,
                amountPaid: 0,
                remainingBalance: 10000,
                status: 'Active'
            }).save();

            const reqA = request(app).post('/api/payments').set('Authorization', `Bearer ${lenderTokenA}`).send({ loanId: smallLoan._id.toString(), amount: 7000, paymentDate: '2026-03-10' });
            const reqB = request(app).post('/api/payments').set('Authorization', `Bearer ${lenderTokenA}`).send({ loanId: smallLoan._id.toString(), amount: 7000, paymentDate: '2026-03-10' });

            const results = await Promise.all([reqA, reqB]);
            const successes = results.filter(r => r.status === 201);
            const failures = results.filter(r => r.status === 400);

            expect(successes.length).toBe(1);
            expect(failures.length).toBe(1);

            const dbLoan = await Loan.findById(smallLoan._id);
            expect(dbLoan.amountPaid).toBe(7000);
            expect(dbLoan.remainingBalance).toBe(3000);
        });

        it('Scenario B: ₹10,000 balance with 2 concurrent ₹5,000 requests -> 2 successes, final balance = 0, status = Closed', async () => {
            const smallLoan = await new Loan({
                lenderId: lenderUserA._id,
                borrowerId: borrowerUserE._id,
                borrowerName: borrowerUserE.name,
                borrowerPhone: borrowerUserE.phone,
                principalAmount: 10000,
                interestRate: 0,
                startDate: new Date(),
                durationMonths: 1,
                totalInterest: 0,
                totalPayable: 10000,
                amountPaid: 0,
                remainingBalance: 10000,
                status: 'Active'
            }).save();

            const reqA = request(app).post('/api/payments').set('Authorization', `Bearer ${lenderTokenA}`).send({ loanId: smallLoan._id.toString(), amount: 5000, paymentDate: '2026-03-10' });
            const reqB = request(app).post('/api/payments').set('Authorization', `Bearer ${lenderTokenA}`).send({ loanId: smallLoan._id.toString(), amount: 5000, paymentDate: '2026-03-10' });

            const results = await Promise.all([reqA, reqB]);
            const successes = results.filter(r => r.status === 201);

            expect(successes.length).toBe(2);

            const dbLoan = await Loan.findById(smallLoan._id);
            expect(dbLoan.amountPaid).toBe(10000);
            expect(dbLoan.remainingBalance).toBe(0);
            expect(dbLoan.status).toBe('Closed');
        });

        it('Scenario C: ₹10,000 balance with 10 concurrent ₹2,000 requests -> 5 successes, 5 failures, total paid = ₹10,000', async () => {
            const smallLoan = await new Loan({
                lenderId: lenderUserA._id,
                borrowerId: borrowerUserE._id,
                borrowerName: borrowerUserE.name,
                borrowerPhone: borrowerUserE.phone,
                principalAmount: 10000,
                interestRate: 0,
                startDate: new Date(),
                durationMonths: 1,
                totalInterest: 0,
                totalPayable: 10000,
                amountPaid: 0,
                remainingBalance: 10000,
                status: 'Active'
            }).save();

            const reqs = Array.from({ length: 10 }, () =>
                request(app)
                    .post('/api/payments')
                    .set('Authorization', `Bearer ${lenderTokenA}`)
                    .send({ loanId: smallLoan._id.toString(), amount: 2000, paymentDate: '2026-03-10' })
            );

            const results = await Promise.all(reqs);
            const successes = results.filter(r => r.status === 201);
            const failures = results.filter(r => r.status === 400);

            expect(successes.length).toBe(5);
            expect(failures.length).toBe(5);

            const dbLoan = await Loan.findById(smallLoan._id);
            expect(dbLoan.amountPaid).toBe(10000);
            expect(dbLoan.remainingBalance).toBe(0);
            expect(dbLoan.status).toBe('Closed');
        });
    });

    describe('6. Financial Invariant & Allocation Verification', () => {

        it('should verify principalPortion + interestPortion = total amount', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    principalPortion: 4000,
                    interestPortion: 1000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(201);
            expect(res.body.payment.principalPortion).toBe(4000);
            expect(res.body.payment.interestPortion).toBe(1000);
            expect(res.body.payment.principalPortion + res.body.payment.interestPortion).toBe(5000);
        });
    });

    describe('7. Loan + Payment Consistency Strategy', () => {

        it('should ensure Loan balance update and Payment creation occur consistently', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 10000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(201);

            const paymentId = res.body.payment._id;
            const dbPayment = await Payment.findById(paymentId);
            const dbLoan = await Loan.findById(testLoan._id);

            expect(dbPayment).not.toBeNull();
            expect(dbPayment.amount).toBe(10000);
            expect(dbLoan.amountPaid).toBe(10000);
            expect(dbLoan.remainingBalance).toBe(40000);
        });
    });

    describe('8. Redis Cache Invalidation & Isolation', () => {

        it('should trigger dual-party cache invalidation for both Lender and Borrower on payment recording', async () => {
            const spyInvalidate = jest.spyOn(redisConfig, 'invalidatePattern');

            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(201);

            expect(spyInvalidate).toHaveBeenCalledWith(`loans:${lenderUserA._id}:*`);
            expect(spyInvalidate).toHaveBeenCalledWith(`loans:${borrowerUserE._id}:*`);
            expect(spyInvalidate).toHaveBeenCalledWith(`dashboard:${lenderUserA._id}*`);
            expect(spyInvalidate).toHaveBeenCalledWith(`dashboard:${borrowerUserE._id}*`);
            expect(spyInvalidate).toHaveBeenCalledWith(`reports:${lenderUserA._id}*`);
            expect(spyInvalidate).toHaveBeenCalledWith(`reports:${borrowerUserE._id}*`);

            spyInvalidate.mockRestore();
        });
    });
});
