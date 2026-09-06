const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');
const User = require('../models/User');

let app;
let lenderToken, borrowerToken, lenderUser, borrowerUser;

beforeAll(async () => {
    await connectDB();
    app = createApp();
    await cleanCollections('users');
});

afterAll(async () => {
    await cleanCollections('users');
    await disconnectDB();
});

describe('Phase 2 — Authentication & User Management', () => {

    describe('POST /api/auth/signup', () => {

        it('should register a new LENDER user with hashed password (password not returned in response)', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    name: 'AuthLender',
                    phone: '9999911111',
                    email: 'authlender@test.com',
                    password: 'password123',
                    role: 'LENDER',
                    address: 'Lender Street'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.name).toBe('AuthLender');
            expect(res.body.user.role).toBe('LENDER');
            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('passwordHash');

            // Verify password stored in DB is hashed and not selected by default
            const dbUserDefault = await User.findById(res.body.user.id);
            expect(dbUserDefault.password).toBeUndefined();

            const dbUserWithPass = await User.findById(res.body.user.id).select('+password');
            expect(dbUserWithPass.password).not.toBe('password123');
            expect(dbUserWithPass.comparePassword('password123')).toBe(true);
        });

        it('should register a new BORROWER user', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    name: 'AuthBorrower',
                    phone: '9999922222',
                    email: 'authborrower@test.com',
                    password: 'password123',
                    role: 'BORROWER',
                    address: 'Borrower Avenue'
                });

            expect(res.status).toBe(201);
            expect(res.body.user.role).toBe('BORROWER');
        });

        it('should reject signup with invalid role (ADMIN or random strings)', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    name: 'InvalidRoleUser',
                    phone: '9999933333',
                    password: 'password123',
                    role: 'ADMIN'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Role must be LENDER or BORROWER/i);
        });

        it('should reject signup with weak password (under 8 characters)', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    name: 'WeakPasswordUser',
                    phone: '9999944444',
                    password: 'short',
                    role: 'LENDER'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/at least 8 characters/i);
        });

        it('should reject duplicate phone signup with 409 Conflict', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    name: 'DuplicateUser',
                    phone: '9999911111',
                    password: 'password123',
                    role: 'LENDER'
                });

            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/already exists/i);
        });
    });

    describe('POST /api/auth/login', () => {

        it('should login successfully with valid credentials and return JWT with sub claim', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    mobileOrEmail: '9999911111',
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).not.toHaveProperty('password');

            lenderToken = res.body.token;
            lenderUser = res.body.user;

            // Verify JWT token payload contains sub and role
            const decoded = jwt.verify(lenderToken, process.env.JWT_SECRET || 'microlend_super_secret_key_2026');
            expect(decoded).toHaveProperty('sub', lenderUser.id.toString());
            expect(decoded).toHaveProperty('role', 'LENDER');
        });

        it('should login borrower successfully', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    mobileOrEmail: '9999922222',
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            borrowerToken = res.body.token;
            borrowerUser = res.body.user;
        });

        it('should reject invalid password with generic 401 "Invalid credentials."', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    mobileOrEmail: '9999911111',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials.');
        });

        it('should reject nonexistent account with generic 401 "Invalid credentials."', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    mobileOrEmail: '0000000000',
                    password: 'password123'
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials.');
        });
    });

    describe('Auth Middleware Verification', () => {

        it('should reject requests with missing Authorization header', async () => {
            const res = await request(app)
                .get('/api/auth/me');

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/No token provided/i);
        });

        it('should reject malformed Authorization header', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Basic 123456');

            expect(res.status).toBe(401);
        });

        it('should reject tampered or invalid JWT token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalidtoken123');

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/Invalid or expired token/i);
        });

        it('should populate req.user correctly for valid JWT token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${lenderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.user._id).toBe(lenderUser.id.toString());
            expect(res.body.user.role).toBe('LENDER');
        });
    });

    describe('GET /api/auth/me & PUT /api/auth/profile', () => {

        it('should retrieve authenticated user profile without password', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${lenderToken}`);

            expect(res.status).toBe(200);
            expect(res.body.user.name).toBe('AuthLender');
            expect(res.body.user.password).toBeUndefined();
        });

        it('should update profile using explicit allowlist (name, address)', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    name: 'Updated Lender Name',
                    address: 'New Address Suite 100'
                });

            expect(res.status).toBe(200);
            expect(res.body.user.name).toBe('Updated Lender Name');

            const dbUser = await User.findById(lenderUser.id);
            expect(dbUser.address).toBe('New Address Suite 100');
        });

        it('should strictly ignore role mutation attempts in profile update', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    role: 'BORROWER' // Client attempting role escalation / mutation
                });

            expect(res.status).toBe(200);

            // Re-verify role in DB remains LENDER
            const dbUser = await User.findById(lenderUser.id);
            expect(dbUser.role).toBe('LENDER');
        });
    });

    describe('PUT /api/auth/password', () => {

        it('should reject password change if current password is incorrect', async () => {
            const res = await request(app)
                .put('/api/auth/password')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    currentPassword: 'wrongpassword',
                    newPassword: 'newpassword123'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Current password is incorrect/i);
        });

        it('should change password successfully with valid current password', async () => {
            const res = await request(app)
                .put('/api/auth/password')
                .set('Authorization', `Bearer ${lenderToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'newpassword123'
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/Password changed successfully/i);

            // Verify login works with new password
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    mobileOrEmail: '9999911111',
                    password: 'newpassword123'
                });

            expect(loginRes.status).toBe(200);
        });
    });
});
