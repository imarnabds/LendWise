const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');

let app;
let lenderL, borrowerA, borrowerB;
let lenderToken, borrowerTokenA, borrowerTokenB;
let loanLA, loanLB, deletedLoan;

const JWT_SECRET = process.env.JWT_SECRET || 'lendwise_jwt_secret_key_2026_dev';

beforeAll(async () => {
    await connectDB();
    app = createApp();
    await cleanCollections('users', 'loans', 'payments');

    // Create Lender L
    lenderL = await User.create({
        name: 'Lender L',
        phone: '9111111111',
        email: 'lenderL@test.com',
        password: 'password123',
        role: 'LENDER'
    });
    lenderToken = jwt.sign({ sub: lenderL._id.toString(), role: lenderL.role }, JWT_SECRET, { expiresIn: '1d' });

    // Create Borrower A
    borrowerA = await User.create({
        name: 'Borrower A',
        phone: '9222222222',
        email: 'borrowerA@test.com',
        password: 'password123',
        role: 'BORROWER',
        emailNotifications: true
    });
    borrowerTokenA = jwt.sign({ sub: borrowerA._id.toString(), role: borrowerA.role }, JWT_SECRET, { expiresIn: '1d' });

    // Create Borrower B
    borrowerB = await User.create({
        name: 'Borrower B',
        phone: '9333333333',
        email: 'borrowerB@test.com',
        password: 'password123',
        role: 'BORROWER',
        emailNotifications: true
    });
    borrowerTokenB = jwt.sign({ sub: borrowerB._id.toString(), role: borrowerB.role }, JWT_SECRET, { expiresIn: '1d' });

    // Create Loan L -> A
    loanLA = await Loan.create({
        lenderId: lenderL._id,
        borrowerId: borrowerA._id,
        borrowerName: borrowerA.name,
        borrowerPhone: borrowerA.phone,
        principalAmount: 30000,
        interestRate: 10,
        startDate: new Date('2026-01-01'),
        durationMonths: 12,
        totalInterest: 3000,
        totalPayable: 33000,
        amountPaid: 3000,
        remainingBalance: 30000,
        emi: 2750,
        dueDate: '05',
        status: 'Active'
    });

    // Create Loan L -> B
    loanLB = await Loan.create({
        lenderId: lenderL._id,
        borrowerId: borrowerB._id,
        borrowerName: borrowerB.name,
        borrowerPhone: borrowerB.phone,
        principalAmount: 50000,
        interestRate: 12,
        startDate: new Date('2026-01-01'),
        durationMonths: 12,
        totalInterest: 6000,
        totalPayable: 56000,
        amountPaid: 0,
        remainingBalance: 56000,
        emi: 4666.67,
        dueDate: '10',
        status: 'Active'
    });

    // Create Soft-Deleted Loan for Borrower A
    deletedLoan = await Loan.create({
        lenderId: lenderL._id,
        borrowerId: borrowerA._id,
        borrowerName: borrowerA.name,
        borrowerPhone: borrowerA.phone,
        principalAmount: 10000,
        interestRate: 10,
        startDate: new Date('2026-01-01'),
        durationMonths: 6,
        totalInterest: 500,
        totalPayable: 10500,
        amountPaid: 0,
        remainingBalance: 10500,
        emi: 1750,
        dueDate: '15',
        status: 'Deleted',
        deletedAt: new Date()
    });
});

afterAll(async () => {
    await cleanCollections('users', 'loans', 'payments');
    await disconnectDB();
});

describe('Phase 11 — Dedicated Borrower Views & Settings Functionality', () => {

    describe('1. Borrower Loan Data Scoping & Two-Borrower Relationship IDOR Matrix', () => {

        it('Borrower A GET /api/loans should return ONLY Loan L->A (excluding Loan L->B and soft-deleted loans)', async () => {
            const res = await request(app)
                .get('/api/loans')
                .set('Authorization', `Bearer ${borrowerTokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].loanId.toString()).toBe(loanLA._id.toString());
            expect(res.body.data[0].borrowerName).toBe('Borrower A');
            expect(res.body.data[0].lenderName).toBe('Lender L');
        });

        it('Borrower B GET /api/loans should return ONLY Loan L->B', async () => {
            const res = await request(app)
                .get('/api/loans')
                .set('Authorization', `Bearer ${borrowerTokenB}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].loanId.toString()).toBe(loanLB._id.toString());
            expect(res.body.data[0].borrowerName).toBe('Borrower B');
        });

        it('Lender L GET /api/loans should return BOTH loans (L->A and L->B)', async () => {
            const res = await request(app)
                .get('/api/loans')
                .set('Authorization', `Bearer ${lenderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
            const loanIds = res.body.data.map((l) => l.loanId.toString());
            expect(loanIds).toContain(loanLA._id.toString());
            expect(loanIds).toContain(loanLB._id.toString());
        });

        it('Borrower A GET /api/loans/:id on Loan L->B should return 403 Forbidden (IDOR Protection)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanLB._id}`)
                .set('Authorization', `Bearer ${borrowerTokenA}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        });

        it('Borrower B GET /api/loans/:id on Loan L->A should return 403 Forbidden (IDOR Protection)', async () => {
            const res = await request(app)
                .get(`/api/loans/${loanLA._id}`)
                .set('Authorization', `Bearer ${borrowerTokenB}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        });

    });

    describe('2. Borrower Dashboard Scoping', () => {

        it('Borrower A GET /api/loans/dashboard should calculate metrics strictly for Borrower A', async () => {
            const res = await request(app)
                .get('/api/loans/dashboard')
                .set('Authorization', `Bearer ${borrowerTokenA}`);

            expect(res.status).toBe(200);
            expect(res.body.totalAmountLent).toBe(30000);
            expect(res.body.totalPaid).toBe(3000);
            expect(res.body.remainingBalance).toBe(30000);
            expect(res.body.activeLoans).toBe(1);
        });

    });

    describe('3. Settings & Profile Notification Preferences Persistence', () => {

        it('Borrower A PUT /api/auth/profile should persist emailNotifications preference to database', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${borrowerTokenA}`)
                .send({
                    name: 'Borrower A Updated',
                    emailNotifications: false,
                    address: '123 Fintech Way'
                });

            expect(res.status).toBe(200);
            expect(res.body.user.name).toBe('Borrower A Updated');
            expect(res.body.user.emailNotifications).toBe(false);
            expect(res.body.user.address).toBe('123 Fintech Way');

            // Verify persistence via GET /api/auth/me
            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${borrowerTokenA}`);

            expect(meRes.status).toBe(200);
            expect(meRes.body.user.emailNotifications).toBe(false);
            expect(meRes.body.user.name).toBe('Borrower A Updated');
        });

        it('Role Immutability: Borrower A attempting role mutation in profile update should be strictly ignored', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${borrowerTokenA}`)
                .send({
                    role: 'LENDER'
                });

            expect(res.status).toBe(200);
            expect(res.body.user.role).toBe('BORROWER');

            // Verify in DB directly
            const dbUser = await User.findById(borrowerA._id);
            expect(dbUser.role).toBe('BORROWER');
        });

    });

});
