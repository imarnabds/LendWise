const request = require('supertest');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');

let app, token, loanId;

beforeAll(async () => {
    await connectDB();
    app = createApp();

    // Create test user
    await cleanCollections('users', 'loans', 'payments');
    const user = new User({
        name: 'PayTestLender',
        phone: '5555551234',
        email: 'paytest@test.com',
        password: 'password123',
        role: 'lender',
        isVerified: true
    });
    await user.save();

    // Login
    const res = await request(app)
        .post('/api/auth/login')
        .send({ mobileOrEmail: '5555551234', password: 'password123' });
    token = res.body.token;

    // Create a loan
    const loanRes = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${token}`)
        .send({
            borrowerName: 'Payment Borrower',
            borrowerPhone: '6666666666',
            principalAmount: 80000,
            interestRate: 2,
            startDate: '2025-05-01',
            durationMonths: 12
        });
    loanId = loanRes.body.loan._id;
});

afterAll(async () => {
    await cleanCollections('users', 'loans', 'payments');
    await disconnectDB();
});

describe('Payments API', () => {

    describe('POST /api/payments', () => {
        it('should record a payment', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    loanId,
                    amount: 5000,
                    interestPortion: 1600,
                    paymentDate: '2025-06-01',
                    mode: 'Cash'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('updatedBalance');
        });

        it('should reject payment without loanId', async () => {
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${token}`)
                .send({ amount: 1000, paymentDate: '2025-06-01' });

            expect([400, 500]).toContain(res.status);
        });
    });

    describe('GET /api/payments', () => {
        it('should return paginated payment history', async () => {
            const res = await request(app)
                .get('/api/payments?page=1&limit=10')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('payments');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.payments)).toBe(true);
            expect(res.body.pagination).toHaveProperty('currentPage', 1);
        });

        it('should respect limit parameter', async () => {
            const res = await request(app)
                .get('/api/payments?page=1&limit=1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.payments.length).toBeLessThanOrEqual(1);
        });
    });

    describe('GET /api/payments/reports', () => {
        it('should return analytics data', async () => {
            const res = await request(app)
                .get('/api/payments/reports')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('revenueTrend');
            expect(res.body).toHaveProperty('paymentConsistency');
            expect(res.body).toHaveProperty('recentTransactions');
            expect(Array.isArray(res.body.revenueTrend)).toBe(true);
            expect(Array.isArray(res.body.paymentConsistency)).toBe(true);
        });
    });
});
