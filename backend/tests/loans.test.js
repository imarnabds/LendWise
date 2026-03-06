const request = require('supertest');
const mongoose = require('mongoose');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');

let app, token, createdLoanId;

beforeAll(async () => {
    await connectDB();
    app = createApp();

    // Create test user directly in DB (bypass verification)
    await cleanCollections('users', 'loans');
    const user = new User({
        name: 'LoanTestLender',
        phone: '2222222222',
        email: 'loantest@test.com',
        password: 'password123',
        role: 'lender',
        isVerified: true
    });
    await user.save();

    // Login to get token
    const res = await request(app)
        .post('/api/auth/login')
        .send({ mobileOrEmail: '2222222222', password: 'password123' });

    token = res.body.token;
});

afterAll(async () => {
    await cleanCollections('users', 'loans');
    await disconnectDB();
});

describe('Loans API', () => {

    describe('POST /api/loans', () => {
        it('should create a new loan', async () => {
            const res = await request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    borrowerName: 'Test Borrower',
                    borrowerPhone: '3333333333',
                    principalAmount: 50000,
                    interestRate: 3,
                    startDate: '2025-06-01',
                    durationMonths: 12
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('loan');
            expect(res.body.loan).toHaveProperty('_id');
            createdLoanId = res.body.loan._id;
        });

        it('should create a second loan', async () => {
            const res = await request(app)
                .post('/api/loans')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    borrowerName: 'Another Borrower',
                    borrowerPhone: '4444444444',
                    principalAmount: 100000,
                    interestRate: 5,
                    startDate: '2025-03-10',
                    durationMonths: 6
                });

            expect(res.status).toBe(201);
        });

        it('should reject unauthenticated request', async () => {
            const res = await request(app)
                .post('/api/loans')
                .send({ borrowerName: 'Fail', principalAmount: 1000 });

            expect([401, 403]).toContain(res.status);
        });
    });

    describe('GET /api/loans', () => {
        it('should return paginated loans with interest fields', async () => {
            const res = await request(app)
                .get('/api/loans?page=1&limit=10')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.pagination).toHaveProperty('currentPage', 1);
            expect(res.body.pagination).toHaveProperty('totalPages');
            expect(res.body.pagination).toHaveProperty('totalRecords');
            expect(res.body.pagination).toHaveProperty('limit', 10);

            if (res.body.data.length > 0) {
                const loan = res.body.data[0];
                expect(loan).toHaveProperty('monthlyInterest');
                expect(loan).toHaveProperty('totalPayable');
                expect(loan).toHaveProperty('pendingInterest');
                expect(loan).toHaveProperty('remainingBalance');
                expect(typeof loan.monthlyInterest).toBe('number');
            }
        });

        it('should respect limit parameter', async () => {
            const res = await request(app)
                .get('/api/loans?page=1&limit=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeLessThanOrEqual(1);
            expect(res.body.pagination.limit).toBe(1);
        });

        it('should filter by status=Active', async () => {
            const res = await request(app)
                .get('/api/loans?status=Active')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            res.body.data.forEach(loan => {
                expect(loan.status).toBe('Active');
            });
        });

        it('should sort by principalAmount ascending', async () => {
            const res = await request(app)
                .get('/api/loans?sortBy=principalAmount&order=asc&limit=50')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            const amounts = res.body.data.map(l => l.principal);
            for (let i = 1; i < amounts.length; i++) {
                expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
            }
        });
    });

    describe('GET /api/loans/dashboard', () => {
        it('should return dashboard statistics', async () => {
            const res = await request(app)
                .get('/api/loans/dashboard')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalBorrowers');
            expect(res.body).toHaveProperty('totalAmountLent');
            expect(res.body).toHaveProperty('monthlyInterest');
            expect(res.body).toHaveProperty('loanPortfolio');
            expect(typeof res.body.totalBorrowers).toBe('number');
        });
    });

    describe('GET /api/loans/pending', () => {
        it('should return pending payments with pagination', async () => {
            const res = await request(app)
                .get('/api/loans/pending?page=1&limit=5')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('pendingPayments');
            expect(res.body).toHaveProperty('pagination');
        });
    });

    describe('GET /api/loans/:id', () => {
        it('should return loan detail with interest fields', async () => {
            if (!createdLoanId) return;

            const res = await request(app)
                .get(`/api/loans/${createdLoanId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('monthlyInterest');
        });

        it('should return 404 for non-existent loan', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/loans/${fakeId}`)
                .set('Authorization', `Bearer ${token}`);

            expect([404, 500]).toContain(res.status);
        });
    });

    describe('DELETE /api/loans/:id', () => {
        it('should soft-delete a loan', async () => {
            if (!createdLoanId) return;

            const res = await request(app)
                .delete(`/api/loans/${createdLoanId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/loans/borrower-history', () => {
        it('should return soft-deleted borrowers', async () => {
            const res = await request(app)
                .get('/api/loans/borrower-history?page=1&limit=5')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('history');
            expect(res.body).toHaveProperty('pagination');
        });
    });
});
