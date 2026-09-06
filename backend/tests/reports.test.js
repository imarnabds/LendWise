const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');

let app;
let lenderToken, lenderUser, borrowerUser;

const JWT_SECRET = process.env.JWT_SECRET || 'lendwise_jwt_secret_key_2026_dev';

beforeAll(async () => {
    await connectDB();
    app = createApp();
    await cleanCollections('users', 'loans', 'payments');

    // Create test lender
    lenderUser = await User.create({
        name: 'Report Test Lender',
        phone: '9000000003',
        email: 'reportlender@test.com',
        password: 'password123',
        role: 'LENDER'
    });
    lenderToken = jwt.sign({ id: lenderUser._id, role: lenderUser.role }, JWT_SECRET, { expiresIn: '1d' });

    // Create test borrower
    borrowerUser = await User.create({
        name: 'Report Borrower',
        phone: '9000000004',
        email: 'reportborrower@test.com',
        password: 'password123',
        role: 'BORROWER'
    });

    // Create test loan & payment
    const loan = await Loan.create({
        lenderId: lenderUser._id,
        borrowerId: borrowerUser._id,
        borrowerName: 'Report Borrower',
        borrowerPhone: '9000000004',
        principalAmount: 100000,
        interestRate: 10,
        startDate: new Date('2026-01-01'),
        durationMonths: 6,
        totalInterest: 5000,
        totalPayable: 105000,
        amountPaid: 10000,
        remainingBalance: 95000,
        emi: 17500,
        status: 'Active'
    });

    await Payment.create({
        loanId: loan._id,
        lenderId: lenderUser._id,
        borrowerId: borrowerUser._id,
        borrowerName: 'Report Borrower',
        amount: 10000,
        interestPortion: 1000,
        principalPortion: 9000,
        paymentDate: new Date('2026-02-01'),
        mode: 'Cash'
    });
});

afterAll(async () => {
    await cleanCollections('users', 'loans', 'payments');
    await disconnectDB();
});

describe('Phase 10 — PDF & Excel Reports Engine (/api/reports)', () => {

    describe('GET /api/reports/pdf', () => {

        it('should reject unauthenticated request with 401', async () => {
            const res = await request(app).get('/api/reports/pdf');
            expect(res.status).toBe(401);
        });

        it('should return valid binary PDF document with correct headers', async () => {
            const res = await request(app)
                .get('/api/reports/pdf')
                .set('Authorization', `Bearer ${lenderToken}`)
                .responseType('blob');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/pdf/);
            expect(res.headers['content-disposition']).toMatch(/attachment; filename=.*\.pdf/);

            // Buffer header check for PDF magic bytes
            const pdfBuffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.text || '');
            const pdfMagic = pdfBuffer.slice(0, 5).toString('ascii');
            expect(pdfMagic).toBe('%PDF-');
        });

    });

    describe('GET /api/reports/excel', () => {

        it('should reject unauthenticated request with 401', async () => {
            const res = await request(app).get('/api/reports/excel');
            expect(res.status).toBe(401);
        });

        it('should return valid binary Excel spreadsheet document with correct headers', async () => {
            const res = await request(app)
                .get('/api/reports/excel')
                .set('Authorization', `Bearer ${lenderToken}`)
                .responseType('blob');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application\/xml|text\/xml/);
            expect(res.headers['content-disposition']).toMatch(/attachment; filename=.*\.xlsx/);

            const excelContent = (Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.text || '')).toString('utf-8');
            expect(excelContent).toMatch(/Workbook|Worksheet|Report Test Lender/);
        });

    });

});
