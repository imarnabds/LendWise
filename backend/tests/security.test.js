/**
 * Phase 7 — Production Hardening, Security, IDOR, Financial Invariants,
 * and Operational Readiness Test Suite.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');

let app;
let lenderAToken, lenderBToken, borrowerEToken, borrowerFToken;
let lenderAUser, lenderBUser, borrowerEUser, borrowerFUser;
let loanAE, loanBE, loanAF;

beforeAll(async () => {
    await connectDB();
    app = createApp();

    await cleanCollections('users', 'loans', 'payments');

    // Create 4 distinct users (2 Lenders, 2 Borrowers) with unique phone numbers & emails
    lenderAUser = await User.create({
        name: 'Lender A Sec',
        phone: '8111111111',
        email: 'sec_lenderA@sec.com',
        password: 'Password123!',
        role: 'LENDER',
        isVerified: true
    });

    lenderBUser = await User.create({
        name: 'Lender B Sec',
        phone: '8222222222',
        email: 'sec_lenderB@sec.com',
        password: 'Password123!',
        role: 'LENDER',
        isVerified: true
    });

    borrowerEUser = await User.create({
        name: 'Borrower E Sec',
        phone: '8333333333',
        email: 'sec_borrowerE@sec.com',
        password: 'Password123!',
        role: 'BORROWER',
        isVerified: true
    });

    borrowerFUser = await User.create({
        name: 'Borrower F Sec',
        phone: '8444444444',
        email: 'sec_borrowerF@sec.com',
        password: 'Password123!',
        role: 'BORROWER',
        isVerified: true
    });

    // Obtain JWT Tokens
    let res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '8111111111', password: 'Password123!' });
    lenderAToken = res.body.token;

    res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '8222222222', password: 'Password123!' });
    lenderBToken = res.body.token;

    res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '8333333333', password: 'Password123!' });
    borrowerEToken = res.body.token;

    res = await request(app).post('/api/auth/login').send({ mobileOrEmail: '8444444444', password: 'Password123!' });
    borrowerFToken = res.body.token;

    // Create 3 Loans: A->E, B->E, A->F
    loanAE = await Loan.create({
        loanId: 'L-SEC-001',
        lenderId: lenderAUser._id,
        borrowerId: borrowerEUser._id,
        borrowerName: borrowerEUser.name,
        borrowerPhone: borrowerEUser.phone,
        principalAmount: 50000,
        interestRate: 12,
        durationMonths: 12,
        startDate: new Date('2026-01-01'),
        monthlyInterest: 500,
        totalInterest: 6000,
        totalPayable: 56000,
        amountPaid: 0,
        remainingBalance: 56000,
        emi: 4666.67,
        status: 'Active'
    });

    loanBE = await Loan.create({
        loanId: 'L-SEC-002',
        lenderId: lenderBUser._id,
        borrowerId: borrowerEUser._id,
        borrowerName: borrowerEUser.name,
        borrowerPhone: borrowerEUser.phone,
        principalAmount: 30000,
        interestRate: 12,
        durationMonths: 12,
        startDate: new Date('2026-01-01'),
        monthlyInterest: 300,
        totalInterest: 3600,
        totalPayable: 33600,
        amountPaid: 0,
        remainingBalance: 33600,
        emi: 2800,
        status: 'Active'
    });

    loanAF = await Loan.create({
        loanId: 'L-SEC-003',
        lenderId: lenderAUser._id,
        borrowerId: borrowerFUser._id,
        borrowerName: borrowerFUser.name,
        borrowerPhone: borrowerFUser.phone,
        principalAmount: 40000,
        interestRate: 12,
        durationMonths: 12,
        startDate: new Date('2026-01-01'),
        monthlyInterest: 400,
        totalInterest: 4800,
        totalPayable: 44800,
        amountPaid: 0,
        remainingBalance: 44800,
        emi: 3733.33,
        status: 'Active'
    });
});

afterAll(async () => {
    await disconnectDB();
});

describe('Phase 7: Security & Production Hardening', () => {

    // ── 1. JWT Authentication Hardening ─────────────────────
    describe('1. JWT Authentication Hardening', () => {
        it('should reject request with missing Authorization header (401)', async () => {
            const res = await request(app).get('/api/loans');
            expect(res.statusCode).toBe(401);
            expect(res.body.message).toMatch(/token/i);
        });

        it('should reject request with malformed JWT token (401)', async () => {
            const res = await request(app)
                .get('/api/loans')
                .set('Authorization', 'Bearer malformed.jwt.token');
            expect(res.statusCode).toBe(401);
        });

        it('should reject request with tampered JWT token (401)', async () => {
            const tamperedToken = lenderAToken.slice(0, -5) + 'xxxxx';
            const res = await request(app)
                .get('/api/loans')
                .set('Authorization', `Bearer ${tamperedToken}`);
            expect(res.statusCode).toBe(401);
        });
    });

    // ── 2. Comprehensive IDOR Matrix Audit ────────────────────
    describe('2. Comprehensive IDOR Matrix Audit', () => {
        it('Lender A accessing Loan A->E (Allowed 200)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanAE._id}`)
                .set('Authorization', `Bearer ${lenderAToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.loan._id.toString()).toBe(loanAE._id.toString());
        });

        it('Lender A accessing Loan B->E (Forbidden 403)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanBE._id}`)
                .set('Authorization', `Bearer ${lenderAToken}`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/unauthorized|forbidden|access/i);
        });

        it('Lender A accessing Loan A->F (Allowed 200)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanAF._id}`)
                .set('Authorization', `Bearer ${lenderAToken}`);
            expect(res.statusCode).toBe(200);
        });

        it('Borrower E accessing Loan A->E (Allowed 200)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanAE._id}`)
                .set('Authorization', `Bearer ${borrowerEToken}`);
            expect(res.statusCode).toBe(200);
        });

        it('Borrower E accessing Loan B->E (Allowed 200)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanBE._id}`)
                .set('Authorization', `Bearer ${borrowerEToken}`);
            expect(res.statusCode).toBe(200);
        });

        it('Borrower E accessing Loan A->F (Forbidden 403)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanAF._id}`)
                .set('Authorization', `Bearer ${borrowerEToken}`);
            expect(res.statusCode).toBe(403);
        });

        it('Borrower F accessing Loan A->F (Allowed 200)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanAF._id}`)
                .set('Authorization', `Bearer ${borrowerFToken}`);
            expect(res.statusCode).toBe(200);
        });

        it('Borrower F accessing Loan A->E (Forbidden 403)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanAE._id}`)
                .set('Authorization', `Bearer ${borrowerFToken}`);
            expect(res.statusCode).toBe(403);
        });

        it('Borrower E recording payment on Loan A->F (Forbidden 403)', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({
                    loanId: loanAF._id,
                    amount: 1000,
                    paymentDate: '2026-02-01'
                });
            expect(res.statusCode).toBe(403);
        });
    });

    // ── 3. Role Enforcement & Profile Privileges ──────────────
    describe('3. Role Enforcement & Privileges', () => {
        it('Borrower attempting metadata update on loan (Forbidden 403)', async () => {
            const res = await request(app)
                .put(`/api/loans/${loanAE._id}`)
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ borrowerName: 'Hacked Name' });
            expect(res.statusCode).toBe(403);
        });

        it('Borrower attempting soft deletion on loan (Forbidden 403)', async () => {
            const res = await request(app)
                .delete(`/api/loans/${loanAE._id}`)
                .set('Authorization', `Bearer ${borrowerEToken}`);
            expect(res.statusCode).toBe(403);
        });

        it('Borrower updating profile to change role to LENDER (Role Immutability)', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ name: 'Borrower E Updated', role: 'LENDER' });
            expect(res.statusCode).toBe(200);
            expect(res.body.user.role).toBe('BORROWER'); // Role must remain unchanged
        });
    });

    // ── 4. Mass Assignment & Field Forging Protection ─────────
    describe('4. Mass Assignment Protection', () => {
        it('Lender creating loan with forged amountPaid/remainingBalance (Overridden authoritatively)', async () => {
            const res = await request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${lenderAToken}`)
                .send({
                    borrowerName: borrowerEUser.name,
                    borrowerPhone: borrowerEUser.phone,
                    principalAmount: 10000,
                    interestRate: 10,
                    startDate: '2026-01-01',
                    durationMonths: 6,
                    // Forged fields:
                    lenderId: lenderBUser._id,
                    amountPaid: 10000,
                    remainingBalance: 0,
                    status: 'Closed'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.loan.lenderId.toString()).toBe(lenderAUser._id.toString());
            expect(res.body.loan.amountPaid).toBe(0);
            expect(res.body.loan.remainingBalance).toBe(res.body.loan.totalPayable);
            expect(res.body.loan.status).toBe('Active');
        });

        it('Borrower recording payment with forged balance fields (Ignored by server)', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({
                    loanId: loanAE._id,
                    amount: 5000,
                    paymentDate: '2026-02-01',
                    // Forged financial fields:
                    amountPaid: 56000,
                    remainingBalance: 0,
                    status: 'Closed'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.updatedBalance).toBe(51000);
            expect(res.body.loanStatus).toBe('Active');
        });
    });

    // ── 5. NoSQL Operator Injection & Input Validation ────────
    describe('5. Input Validation & Injection Prevention', () => {
        it('Sanitizes NoSQL operator injection in query string', async () => {
            const res = await request(app)
                .get('/api/loans?status[$ne]=Closed')
                .set('Authorization', `Bearer ${lenderAToken}`);
            expect(res.statusCode).toBe(200);
            // $ne operator should be sanitized, returning normal query results safely
        });

        it('Rejects malformed ObjectId in GET /api/loans/:id (400 Bad Request)', async () => {
            const res = await request(app)
                .get('/api/loans/123invalidobjectid')
                .set('Authorization', `Bearer ${lenderAToken}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/invalid id format/i);
        });

        it('Handles null or undefined string path params safely (400 Bad Request)', async () => {
            const res = await request(app)
                .get('/api/loans/null')
                .set('Authorization', `Bearer ${lenderAToken}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/invalid id format/i);
        });
    });

    // ── 6. Financial Invariants & Extreme Values ──────────────────
    describe('6. Financial Invariants & Extreme Values', () => {
        it('Rejects negative payment amount (400)', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ loanId: loanAE._id, amount: -500, paymentDate: '2026-02-01' });
            expect(res.statusCode).toBe(400);
        });

        it('Rejects zero payment amount (400)', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ loanId: loanAE._id, amount: 0, paymentDate: '2026-02-01' });
            expect(res.statusCode).toBe(400);
        });

        it('Rejects non-numeric payment amount (400)', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ loanId: loanAE._id, amount: 'invalid_number', paymentDate: '2026-02-01' });
            expect(res.statusCode).toBe(400);
        });

        it('Rejects overpayment exceeding remaining balance (400)', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ loanId: loanAE._id, amount: 999999, paymentDate: '2026-02-01' });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/exceeds/i);
        });

        it('Verifies financial invariant: remainingBalance = totalPayable - amountPaid', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ loanId: loanBE._id, amount: 10000, paymentDate: '2026-02-01' });

            expect(res.statusCode).toBe(201);
            expect(res.body.updatedBalance).toBe(23600);

            // Fetch authoritative loan state to verify invariant
            const loanRes = await request(app)
                .get(`/api/loans/${loanBE._id}`)
                .set('Authorization', `Bearer ${borrowerEToken}`);
            const updatedLoan = loanRes.body.loan;
            expect(updatedLoan.remainingBalance).toBe(updatedLoan.totalPayable - updatedLoan.amountPaid);
            expect(updatedLoan.remainingBalance).toBe(23600);
        });
    });

    // ── 7. Soft Delete & Closed Loan Payment Rejection ─────────
    describe('7. Soft-Deleted & Closed Loan Payment Protection', () => {
        it('Soft-deleted loan rejects new payments (400)', async () => {
            // Lender A soft deletes loanAF
            await request(app)
                .delete(`/api/loans/${loanAF._id}`)
                .set('Authorization', `Bearer ${lenderAToken}`);

            // Borrower F attempts payment on soft-deleted loanAF
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerFToken}`)
                .send({ loanId: loanAF._id, amount: 5000, paymentDate: '2026-02-01' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/archived|deleted|cannot accept/i);
        });

        it('Exact final payment closes loan and rejects further payments (400)', async () => {
            // Pay remaining 23600 on loanBE to close it
            let res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ loanId: loanBE._id, amount: 23600, paymentDate: '2026-02-01' });

            expect(res.statusCode).toBe(201);
            expect(res.body.updatedBalance).toBe(0);
            expect(res.body.loanStatus).toBe('Closed');

            // Attempt additional payment on closed loan
            res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${borrowerEToken}`)
                .send({ loanId: loanBE._id, amount: 1000, paymentDate: '2026-02-01' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/closed|fully paid/i);
        });
    });

    // ── 8. Health Check Operational Signal ────────────────────
    describe('8. Operational Health Signals', () => {
        it('GET /api/health returns healthy status & service details', async () => {
            const res = await request(app).get('/api/health');
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('healthy');
            expect(res.body.services.database).toBe('connected');
            expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
            expect(res.body.timestamp).toBeDefined();
        });
    });
});
