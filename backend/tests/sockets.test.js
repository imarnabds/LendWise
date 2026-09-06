const request = require('supertest');
const mongoose = require('mongoose');
const http = require('http');
const { io: ClientIO } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const { initSocket, closeSocket } = require('../socket/socketServer');
const registerSocketEvents = require('../socket/socketEvents');

let app, server, serverUrl;
let lenderUserA, lenderUserB, borrowerUserE, borrowerUserF;
let lenderTokenA, lenderTokenB, borrowerTokenE, borrowerTokenF;
let testLoan;

beforeAll(async () => {
    await connectDB();
    app = createApp();

    // Attach Socket.IO to test HTTP server
    server = http.createServer(app);
    initSocket(server);
    registerSocketEvents();

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    serverUrl = `http://localhost:${port}`;

    await cleanCollections('users', 'loans', 'payments');

    // Create Users: Lender A, Lender B, Borrower E, Borrower F
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
    await closeSocket();
    await new Promise((resolve) => server.close(resolve));
    await cleanCollections('users', 'loans', 'payments');
    await disconnectDB();
});

const createTestSocket = (token) => {
    return ClientIO(serverUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false
    });
};

describe('Phase 5 — Real-Time Two-Way Synchronization Test Suite', () => {

    beforeEach(async () => {
        await cleanCollections('loans', 'payments');

        // Standard Loan: Lender A -> Borrower E (₹50,000 total payable)
        testLoan = await new Loan({
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
        }).save();
    });

    describe('1. Socket Authentication Matrix', () => {

        it('should accept connection with valid JWT token', (done) => {
            const socket = createTestSocket(lenderTokenA);
            socket.on('connect', () => {
                expect(socket.connected).toBe(true);
                socket.disconnect();
                done();
            });
        });

        it('should reject connection with missing JWT token', (done) => {
            const socket = ClientIO(serverUrl, {
                transports: ['websocket'],
                reconnection: false
            });

            socket.on('connect_error', (err) => {
                expect(err.message).toMatch(/Authentication error/i);
                socket.disconnect();
                done();
            });
        });

        it('should reject connection with invalid/malformed JWT token', (done) => {
            const socket = createTestSocket('invalid.jwt.token');

            socket.on('connect_error', (err) => {
                expect(err.message).toMatch(/Authentication error/i);
                socket.disconnect();
                done();
            });
        });

        it('should reject connection with expired JWT token', (done) => {
            const secret = process.env.JWT_SECRET || 'microlend_jwt_secret_key_2026';
            const expiredToken = jwt.sign({ sub: lenderUserA._id.toString(), role: 'LENDER' }, secret, { expiresIn: '-1s' });

            const socket = createTestSocket(expiredToken);

            socket.on('connect_error', (err) => {
                expect(err.message).toMatch(/Authentication error/i);
                socket.disconnect();
                done();
            });
        });

        it('should reject connection with tampered JWT token', (done) => {
            const tamperedToken = lenderTokenA + 'tampered';
            const socket = createTestSocket(tamperedToken);

            socket.on('connect_error', (err) => {
                expect(err.message).toMatch(/Authentication error/i);
                socket.disconnect();
                done();
            });
        });
    });

    describe('2. Room Authorization & User Isolation', () => {

        it('should allow Lender A to join loan room loan:LoanId', (done) => {
            const socket = createTestSocket(lenderTokenA);
            socket.on('connect', () => {
                socket.emit('joinLoan', { loanId: testLoan._id.toString() }, (response) => {
                    expect(response.status).toBe('ok');
                    expect(response.room).toBe(`loan:${testLoan._id.toString()}`);
                    socket.disconnect();
                    done();
                });
            });
        });

        it('should allow Borrower E to join loan room loan:LoanId', (done) => {
            const socket = createTestSocket(borrowerTokenE);
            socket.on('connect', () => {
                socket.emit('joinLoan', { loanId: testLoan._id.toString() }, (response) => {
                    expect(response.status).toBe('ok');
                    expect(response.room).toBe(`loan:${testLoan._id.toString()}`);
                    socket.disconnect();
                    done();
                });
            });
        });

        it('should reject unauthorized Lender B from joining loan room loan:LoanId (403)', (done) => {
            const socket = createTestSocket(lenderTokenB);
            socket.on('connect', () => {
                socket.emit('joinLoan', { loanId: testLoan._id.toString() }, (response) => {
                    expect(response.status).toBe('error');
                    expect(response.message).toMatch(/Access denied/i);
                    socket.disconnect();
                    done();
                });
            });
        });

        it('should reject unauthorized Borrower F from joining loan room loan:LoanId (403)', (done) => {
            const socket = createTestSocket(borrowerTokenF);
            socket.on('connect', () => {
                socket.emit('joinLoan', { loanId: testLoan._id.toString() }, (response) => {
                    expect(response.status).toBe('error');
                    expect(response.message).toMatch(/Access denied/i);
                    socket.disconnect();
                    done();
                });
            });
        });
    });

    describe('3. Real-Time Payment Event Delivery & Cross-User Isolation', () => {

        it('should deliver payment.created event to Lender A and Borrower E, but NOT Lender B or Borrower F', async () => {
            const socketA = createTestSocket(lenderTokenA);
            const socketE = createTestSocket(borrowerTokenE);
            const socketB = createTestSocket(lenderTokenB);
            const socketF = createTestSocket(borrowerTokenF);

            let eventA = null, eventE = null, eventB = null, eventF = null;

            await Promise.all([
                new Promise((res) => socketA.on('connect', res)),
                new Promise((res) => socketE.on('connect', res)),
                new Promise((res) => socketB.on('connect', res)),
                new Promise((res) => socketF.on('connect', res))
            ]);

            socketA.on('payment.created', (data) => { eventA = data; });
            socketE.on('payment.created', (data) => { eventE = data; });
            socketB.on('payment.created', (data) => { eventB = data; });
            socketF.on('payment.created', (data) => { eventF = data; });

            // Record payment from Lender A via REST
            const payRes = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01'
                });

            expect(payRes.status).toBe(201);

            // Wait brief moment for socket event dispatch
            await new Promise((res) => setTimeout(res, 200));

            // Verify Lender A & Borrower E received the event
            expect(eventA).not.toBeNull();
            expect(eventA.type).toBe('payment.created');
            expect(eventA.loanId).toBe(testLoan._id.toString());
            expect(eventA.amount).toBe(5000);
            expect(eventA.remainingBalance).toBe(45000);

            expect(eventE).not.toBeNull();
            expect(eventE.loanId).toBe(testLoan._id.toString());
            expect(eventE.remainingBalance).toBe(45000);

            // Verify Lender B & Borrower F received NO event
            expect(eventB).toBeNull();
            expect(eventF).toBeNull();

            socketA.disconnect();
            socketE.disconnect();
            socketB.disconnect();
            socketF.disconnect();
        });
    });

    describe('4. Failed Payment Guard', () => {

        it('should NOT emit Socket.IO event when payment request fails (e.g. overpayment)', async () => {
            const socketA = createTestSocket(lenderTokenA);
            let receivedEvent = null;

            await new Promise((res) => socketA.on('connect', res));
            socketA.on('payment.created', (data) => { receivedEvent = data; });

            // Attempt overpayment of ₹60,000 on ₹50,000 loan
            const res = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 60000,
                    paymentDate: '2026-03-01'
                });

            expect(res.status).toBe(400);

            await new Promise((res) => setTimeout(res, 200));

            expect(receivedEvent).toBeNull();
            socketA.disconnect();
        });
    });

    describe('5. Final Payment & State Closure Delivery', () => {

        it('should deliver final payment state (remainingBalance=0, status=Closed) to both parties', async () => {
            testLoan.amountPaid = 45000;
            testLoan.remainingBalance = 5000;
            await testLoan.save();

            const socketA = createTestSocket(lenderTokenA);
            const socketE = createTestSocket(borrowerTokenE);

            let eventA = null, eventE = null;

            await Promise.all([
                new Promise((res) => socketA.on('connect', res)),
                new Promise((res) => socketE.on('connect', res))
            ]);

            socketA.on('payment.created', (data) => { eventA = data; });
            socketE.on('payment.created', (data) => { eventE = data; });

            // Pay exact final balance of ₹5,000
            const payRes = await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 5000,
                    paymentDate: '2026-03-01'
                });

            expect(payRes.status).toBe(201);

            await new Promise((res) => setTimeout(res, 200));

            expect(eventA).not.toBeNull();
            expect(eventA.remainingBalance).toBe(0);
            expect(eventA.status).toBe('Closed');

            expect(eventE).not.toBeNull();
            expect(eventE.remainingBalance).toBe(0);
            expect(eventE.status).toBe('Closed');

            socketA.disconnect();
            socketE.disconnect();
        });
    });

    describe('6. Multiple Connections for Same User', () => {

        it('should deliver payment events to all active sockets belonging to the user', async () => {
            const socketA1 = createTestSocket(lenderTokenA);
            const socketA2 = createTestSocket(lenderTokenA);

            let eventA1 = null, eventA2 = null;

            await Promise.all([
                new Promise((res) => socketA1.on('connect', res)),
                new Promise((res) => socketA2.on('connect', res))
            ]);

            socketA1.on('payment.created', (d) => { eventA1 = d; });
            socketA2.on('payment.created', (d) => { eventA2 = d; });

            await request(app)
                .post('/api/payments')
                .set('Authorization', `Bearer ${lenderTokenA}`)
                .send({
                    loanId: testLoan._id.toString(),
                    amount: 2000,
                    paymentDate: '2026-03-01'
                });

            await new Promise((res) => setTimeout(res, 200));

            expect(eventA1).not.toBeNull();
            expect(eventA2).not.toBeNull();
            expect(eventA1.paymentId).toBe(eventA2.paymentId);

            socketA1.disconnect();
            socketA2.disconnect();
        });
    });
});
