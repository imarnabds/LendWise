const request = require('supertest');
const mongoose = require('mongoose');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');

let app;
let lenderToken, borrowerToken, otherLenderToken;
let lenderUser, borrowerUser, otherLenderUser;

beforeAll(async () => {
    await connectDB();
    app = createApp();

    await cleanCollections('users', 'loans', 'payments');

    // Create primary LENDER
    lenderUser = new User({
        name: 'PrimaryLender',
        phone: '1111111111',
        email: 'lender@test.com',
        password: 'password123',
        role: 'LENDER',
        isVerified: true
    });
    await lenderUser.save();

    // Create primary BORROWER
    borrowerUser = new User({
        name: 'PrimaryBorrower',
        phone: '2222222222',
        email: 'borrower@test.com',
        password: 'password123',
        role: 'BORROWER',
        isVerified: true
    });
    await borrowerUser.save();

    // Create secondary LENDER (for role mismatch tests)
    otherLenderUser = new User({
        name: 'OtherLender',
        phone: '3333333333',
        email: 'otherlender@test.com',
        password: 'password123',
        role: 'LENDER',
        isVerified: true
    });
    await otherLenderUser.save();

    // Logins
    let res = await request(app)
        .post('/api/auth/login')
        .send({ mobileOrEmail: '1111111111', password: 'password123' });
    lenderToken = res.body.token;

    res = await request(app)
        .post('/api/auth/login')
        .send({ mobileOrEmail: '2222222222', password: 'password123' });
    borrowerToken = res.body.token;

    res = await request(app)
        .post('/api/auth/login')
        .send({ mobileOrEmail: '3333333333', password: 'password123' });
    otherLenderToken = res.body.token;
});

afterAll(async () => {
    await cleanCollections('users', 'loans', 'payments');
    await disconnectDB();
});

describe('Loans API — Phase 2 Architecture & Authorization', () => {

    describe('POST /api/loans — APR Calculations & Borrower Existence Check', () => {

        it('should create a loan for existing borrower and calculate APR simple interest correctly', async () => {
            const res = await request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    borrowerId: borrowerUser._id.toString(),
                    borrowerName: borrowerUser.name,
                    borrowerPhone: borrowerUser.phone,
                    principalAmount: 50000,
                    interestRate: 12,
                    startDate: '2026-01-01',
                    durationMonths: 12
                });

            expect(res.status).toBe(201);
            const loan = res.body.loan;
            expect(loan.principalAmount).toBe(50000);
            expect(loan.interestRate).toBe(12);
            expect(loan.totalInterest).toBe(6000);
            expect(loan.totalPayable).toBe(56000);
            expect(loan.amountPaid).toBe(0);
            expect(loan.remainingBalance).toBe(56000);
            expect(loan.emi).toBe(4666.67);
        });

        it('should reject loan creation with 404 Not Found if borrower user does NOT exist', async () => {
            const res = await request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    borrowerPhone: '9990009990', // Unregistered borrower phone
                    borrowerName: 'Unregistered Borrower',
                    principalAmount: 10000,
                    interestRate: 5,
                    startDate: '2026-01-01',
                    durationMonths: 6
                });

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/Borrower user not found/i);
        });

        it('should reject loan creation with invalid lender role (user is BORROWER)', async () => {
            const res = await request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    lenderId: borrowerUser._id.toString(), // borrowerUser role is BORROWER
                    borrowerId: borrowerUser._id.toString(),
                    borrowerName: borrowerUser.name,
                    borrowerPhone: borrowerUser.phone,
                    principalAmount: 10000,
                    interestRate: 5,
                    startDate: '2026-01-01',
                    durationMonths: 6
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not have role LENDER/i);
        });

        it('should reject loan creation with invalid borrower role (user is LENDER)', async () => {
            const res = await request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    borrowerId: otherLenderUser._id.toString(), // otherLenderUser role is LENDER
                    borrowerName: otherLenderUser.name,
                    borrowerPhone: otherLenderUser.phone,
                    principalAmount: 10000,
                    interestRate: 5,
                    startDate: '2026-01-01',
                    durationMonths: 6
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not have role BORROWER/i);
        });
    });

    describe('Resource & Collection Authorization (Lender vs Borrower)', () => {

        let loanId;

        beforeEach(async () => {
            const loan = new Loan({
                lenderId: lenderUser._id,
                borrowerId: borrowerUser._id,
                borrowerName: borrowerUser.name,
                borrowerPhone: borrowerUser.phone,
                principalAmount: 20000,
                interestRate: 10,
                startDate: new Date(),
                durationMonths: 10,
                totalInterest: 2000,
                totalPayable: 22000,
                amountPaid: 0,
                remainingBalance: 22000,
                emi: 2200
            });
            await loan.save();
            loanId = loan._id.toString();
        });

        it('should allow Lender to read single loan detail', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${lenderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.loan._id).toBe(loanId);
        });

        it('should allow Borrower to read single loan detail where borrowerId matches', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${borrowerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.loan._id).toBe(loanId);
        });

        it('should reject third-party lender from reading another lender loan (IDOR protection)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${otherLenderToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/You are not authorized to view this loan/i);
        });

        it('should allow Lender to update metadata, but reject Borrower with 403 Forbidden', async () => {
            // Attempt update as Borrower -> expect 403
            const borrowerRes = await request(app)
                .put(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${borrowerToken}`)
                .send({ notes: 'Borrower notes attempt' });

            expect(borrowerRes.status).toBe(403);
            expect(borrowerRes.body.message).toMatch(/Only the lender can update loan metadata/i);

            // Update as Lender -> expect 200
            const lenderRes = await request(app)
                .put(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({ notes: 'Lender updated notes' });

            expect(lenderRes.status).toBe(200);
        });

        it('should allow Lender to soft-delete loan, but reject Borrower with 403 Forbidden', async () => {
            // Delete as Borrower -> expect 403
            const borrowerRes = await request(app)
                .delete(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${borrowerToken}`);

            expect(borrowerRes.status).toBe(403);
            expect(borrowerRes.body.message).toMatch(/Only the lender can delete a loan/i);

            // Delete as Lender -> expect 200
            const lenderRes = await request(app)
                .delete(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${lenderToken}`);

            expect(lenderRes.status).toBe(200);
        });

        it('should enforce immutable financial and relational fields during updates', async () => {
            const res = await request(app)
                .put(`/api/loans/${loanId}`)
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    principalAmount: 100,
                    remainingBalance: 0,
                    lenderId: otherLenderUser._id.toString(),
                    notes: 'Legal metadata update'
                });

            expect(res.status).toBe(200);

            const dbLoan = await Loan.findById(loanId);
            expect(dbLoan.principalAmount).toBe(20000);
            expect(dbLoan.remainingBalance).toBe(22000);
            expect(dbLoan.lenderId.toString()).toBe(lenderUser._id.toString());
            expect(dbLoan.notes).toBe('Legal metadata update');
        });
    });

    describe('Phase 3 — Mandatory Two-Sided Portfolio Acceptance Test Matrix', () => {

        let lenderA, lenderB, borrowerE, borrowerF;
        let tokenA, tokenB, tokenE, tokenF;
        let loan1, loan2, loan3;

        beforeAll(async () => {
            // Setup users
            lenderA = new User({ name: 'Lender A', phone: '4444444444', email: 'lenderA@test.com', password: 'password123', role: 'LENDER', isVerified: true });
            await lenderA.save();

            lenderB = new User({ name: 'Lender B', phone: '5555555555', email: 'lenderB@test.com', password: 'password123', role: 'LENDER', isVerified: true });
            await lenderB.save();

            borrowerE = new User({ name: 'Borrower E', phone: '6666666666', email: 'borrowerE@test.com', password: 'password123', role: 'BORROWER', isVerified: true });
            await borrowerE.save();

            borrowerF = new User({ name: 'Borrower F', phone: '7777777777', email: 'borrowerF@test.com', password: 'password123', role: 'BORROWER', isVerified: true });
            await borrowerF.save();

            // Logins
            let res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '4444444444', password: 'password123' });
            tokenA = res.body.token;

            res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '5555555555', password: 'password123' });
            tokenB = res.body.token;

            res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '6666666666', password: 'password123' });
            tokenE = res.body.token;

            res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '7777777777', password: 'password123' });
            tokenF = res.body.token;

            // Create Loan 1: A -> E
            loan1 = new Loan({
                lenderId: lenderA._id,
                borrowerId: borrowerE._id,
                borrowerName: borrowerE.name,
                borrowerPhone: borrowerE.phone,
                principalAmount: 50000,
                interestRate: 12,
                startDate: new Date('2026-01-01'),
                durationMonths: 12,
                totalInterest: 6000,
                totalPayable: 56000,
                amountPaid: 0,
                remainingBalance: 56000,
                emi: 4666.67
            });
            await loan1.save();

            // Create Loan 2: B -> E
            loan2 = new Loan({
                lenderId: lenderB._id,
                borrowerId: borrowerE._id,
                borrowerName: borrowerE.name,
                borrowerPhone: borrowerE.phone,
                principalAmount: 30000,
                interestRate: 10,
                startDate: new Date('2026-02-01'),
                durationMonths: 6,
                totalInterest: 1500,
                totalPayable: 31500,
                amountPaid: 0,
                remainingBalance: 31500,
                emi: 5250
            });
            await loan2.save();

            // Create Loan 3: A -> F
            loan3 = new Loan({
                lenderId: lenderA._id,
                borrowerId: borrowerF._id,
                borrowerName: borrowerF.name,
                borrowerPhone: borrowerF.phone,
                principalAmount: 20000,
                interestRate: 8,
                startDate: new Date('2026-03-01'),
                durationMonths: 10,
                totalInterest: 1333.33,
                totalPayable: 21333.33,
                amountPaid: 0,
                remainingBalance: 21333.33,
                emi: 2133.33
            });
            await loan3.save();
        });

        it('Lender A sees exactly Loan 1 (A->E) and Loan 3 (A->F)', async () => {
            const res = await request(app).get('/api/loans').set('Authorization', `Bearer ${tokenA}`);
            expect(res.status).toBe(200);
            const ids = res.body.data.map((l) => l.loanId.toString());
            expect(ids).toHaveLength(2);
            expect(ids).toContain(loan1._id.toString());
            expect(ids).toContain(loan3._id.toString());
            expect(ids).not.toContain(loan2._id.toString());
        });

        it('Lender B sees exactly Loan 2 (B->E)', async () => {
            const res = await request(app).get('/api/loans').set('Authorization', `Bearer ${tokenB}`);
            expect(res.status).toBe(200);
            const ids = res.body.data.map((l) => l.loanId.toString());
            expect(ids).toHaveLength(1);
            expect(ids).toContain(loan2._id.toString());
        });

        it('Borrower E sees exactly Loan 1 (A->E) and Loan 2 (B->E)', async () => {
            const res = await request(app).get('/api/loans').set('Authorization', `Bearer ${tokenE}`);
            expect(res.status).toBe(200);
            const ids = res.body.data.map((l) => l.loanId.toString());
            expect(ids).toHaveLength(2);
            expect(ids).toContain(loan1._id.toString());
            expect(ids).toContain(loan2._id.toString());
            expect(ids).not.toContain(loan3._id.toString());
        });

        it('Borrower F sees exactly Loan 3 (A->F)', async () => {
            const res = await request(app).get('/api/loans').set('Authorization', `Bearer ${tokenF}`);
            expect(res.status).toBe(200);
            const ids = res.body.data.map((l) => l.loanId.toString());
            expect(ids).toHaveLength(1);
            expect(ids).toContain(loan3._id.toString());
        });

        // ── Single Resource Detail IDOR Matrix Tests ──────────────────────────────
        it('IDOR Check: Lender A accessing Loan 1 (A->E) -> 200 OK', async () => {
            const res = await request(app).get(`/api/loans/${loan1._id}`).set('Authorization', `Bearer ${tokenA}`);
            expect(res.status).toBe(200);
        });

        it('IDOR Check: Lender A accessing Loan 3 (A->F) -> 200 OK', async () => {
            const res = await request(app).get(`/api/loans/${loan3._id}`).set('Authorization', `Bearer ${tokenA}`);
            expect(res.status).toBe(200);
        });

        it('IDOR Check: Lender B accessing Loan 2 (B->E) -> 200 OK', async () => {
            const res = await request(app).get(`/api/loans/${loan2._id}`).set('Authorization', `Bearer ${tokenB}`);
            expect(res.status).toBe(200);
        });

        it('IDOR Check: Borrower E accessing Loan 1 (A->E) -> 200 OK', async () => {
            const res = await request(app).get(`/api/loans/${loan1._id}`).set('Authorization', `Bearer ${tokenE}`);
            expect(res.status).toBe(200);
        });

        it('IDOR Check: Borrower E accessing Loan 2 (B->E) -> 200 OK', async () => {
            const res = await request(app).get(`/api/loans/${loan2._id}`).set('Authorization', `Bearer ${tokenE}`);
            expect(res.status).toBe(200);
        });

        it('IDOR Check: Borrower F accessing Loan 3 (A->F) -> 200 OK', async () => {
            const res = await request(app).get(`/api/loans/${loan3._id}`).set('Authorization', `Bearer ${tokenF}`);
            expect(res.status).toBe(200);
        });

        it('IDOR Check: Lender A accessing Loan 2 (B->E) -> 403 Forbidden', async () => {
            const res = await request(app).get(`/api/loans/${loan2._id}`).set('Authorization', `Bearer ${tokenA}`);
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        });

        it('IDOR Check: Lender B accessing Loan 1 (A->E) -> 403 Forbidden', async () => {
            const res = await request(app).get(`/api/loans/${loan1._id}`).set('Authorization', `Bearer ${tokenB}`);
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        });

        it('IDOR Check: Borrower E accessing Loan 3 (A->F) -> 403 Forbidden', async () => {
            const res = await request(app).get(`/api/loans/${loan3._id}`).set('Authorization', `Bearer ${tokenE}`);
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        });

        it('IDOR Check: Borrower F accessing Loan 1 (A->E) -> 403 Forbidden', async () => {
            const res = await request(app).get(`/api/loans/${loan1._id}`).set('Authorization', `Bearer ${tokenF}`);
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        });

        it('IDOR Check: Borrower F accessing Loan 2 (B->E) -> 403 Forbidden', async () => {
            const res = await request(app).get(`/api/loans/${loan2._id}`).set('Authorization', `Bearer ${tokenF}`);
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        });
    });

    describe('Phase 3 — Concurrent Loan Creation & Duplicate Relationship Enforcement', () => {

        it('should handle simultaneous concurrent loan creation for Lender A and Borrower E cleanly (Option B)', async () => {
            const req1 = request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    borrowerId: borrowerUser._id.toString(),
                    borrowerName: borrowerUser.name,
                    borrowerPhone: borrowerUser.phone,
                    principalAmount: 15000,
                    interestRate: 10,
                    startDate: '2026-04-01',
                    durationMonths: 6
                });

            const req2 = request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    borrowerId: borrowerUser._id.toString(),
                    borrowerName: borrowerUser.name,
                    borrowerPhone: borrowerUser.phone,
                    principalAmount: 25000,
                    interestRate: 12,
                    startDate: '2026-04-01',
                    durationMonths: 12
                });

            const [res1, res2] = await Promise.all([req1, req2]);

            expect(res1.status).toBe(201);
            expect(res2.status).toBe(201);
            expect(res1.body.loan._id).not.toEqual(res2.body.loan._id);
        });
    });

    describe('Phase 3 — Mass Assignment Security Verification', () => {

        it('should block mass assignment attempts to mutate immutable financial or identity fields', async () => {
            const loan = new Loan({
                lenderId: lenderUser._id,
                borrowerId: borrowerUser._id,
                borrowerName: borrowerUser.name,
                borrowerPhone: borrowerUser.phone,
                principalAmount: 50000,
                interestRate: 12,
                startDate: new Date(),
                durationMonths: 12,
                totalInterest: 6000,
                totalPayable: 56000,
                amountPaid: 0,
                remainingBalance: 56000,
                status: 'Active',
                notes: 'Original note'
            });
            await loan.save();

            const res = await request(app)
                .put(`/api/loans/${loan._id}`)
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    lenderId: '65f111111111111111111111',
                    borrowerId: '65f222222222222222222222',
                    principalAmount: 1,
                    interestRate: 0,
                    durationMonths: 1,
                    totalPayable: 1,
                    amountPaid: 99999,
                    remainingBalance: 0,
                    notes: 'Updated allowed note'
                });

            expect(res.status).toBe(200);

            const fetched = await Loan.findById(loan._id);
            expect(fetched.lenderId.toString()).toEqual(lenderUser._id.toString());
            expect(fetched.borrowerId.toString()).toEqual(borrowerUser._id.toString());
            expect(fetched.principalAmount).toBe(50000);
            expect(fetched.interestRate).toBe(12);
            expect(fetched.durationMonths).toBe(12);
            expect(fetched.totalPayable).toBe(56000);
            expect(fetched.amountPaid).toBe(0);
            expect(fetched.remainingBalance).toBe(56000);
            expect(fetched.notes).toBe('Updated allowed note');
        });
    });

    describe('Phase 3 — Phase 2 Authorization Regression', () => {

        it('should reject requests with missing JWT token (401 Unauthorized)', async () => {
            const res = await request(app).get('/api/loans');
            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/Access denied/i);
        });

        it('should reject requests with invalid/malformed JWT token (401 Unauthorized)', async () => {
            const res = await request(app).get('/api/loans').set('Authorization', 'Bearer invalid.jwt.token');
            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/Invalid or expired token/i);
        });
    });

    describe('Phase 3 — Status Lifecycle & Soft Delete Protection', () => {

        let testLoan;

        beforeEach(async () => {
            testLoan = new Loan({
                lenderId: lenderUser._id,
                borrowerId: borrowerUser._id,
                borrowerName: borrowerUser.name,
                borrowerPhone: borrowerUser.phone,
                principalAmount: 10000,
                interestRate: 10,
                startDate: new Date(),
                durationMonths: 6,
                totalInterest: 500,
                totalPayable: 10500,
                amountPaid: 0,
                remainingBalance: 10500,
                status: 'Active',
                deletedAt: null
            });
            await testLoan.save();
        });

        it('should reject status update to Closed if remainingBalance > 0', async () => {
            const res = await request(app)
                .put(`/api/loans/${testLoan._id}`)
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({ status: 'Closed' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Cannot set status to Closed when remaining balance/i);
        });

        it('should reject payment processing on soft-deleted loans (deletedAt !== null)', async () => {
            // Soft delete loan
            await request(app)
                .delete(`/api/loans/${testLoan._id}`)
                .set('Authorization', `Bearer ${lenderToken}`);

            // Try recording payment
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 1000,
                    paymentDate: '2026-09-05'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Cannot process payment on a soft-deleted or archived loan/i);
        });

        it('should retain soft-deleted loan in MongoDB and show in borrower history', async () => {
            await request(app)
                .delete(`/api/loans/${testLoan._id}`)
                .set('Authorization', `Bearer ${lenderToken}`);

            const dbLoan = await Loan.findById(testLoan._id);
            expect(dbLoan).not.toBeNull();
            expect(dbLoan.deletedAt).not.toBeNull();

            const historyRes = await request(app)
                .get('/api/loans/borrower-history')
                .set('Authorization', `Bearer ${lenderToken}`);

            expect(historyRes.status).toBe(200);
            const historyIds = historyRes.body.history.map(h => h.id.toString());
            expect(historyIds).toContain(testLoan._id.toString());
        });
    });
});
