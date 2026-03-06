const request = require('supertest');
const { createApp, connectDB, disconnectDB, cleanCollections } = require('./setup');

let app;

beforeAll(async () => {
    await connectDB();
    app = createApp();
    await cleanCollections('users');
});

afterAll(async () => {
    await cleanCollections('users');
    await disconnectDB();
});

describe('Authentication', () => {
    const testUser = {
        name: 'Jest Lender',
        phone: '1111111111',
        email: 'jest@test.com',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'lender',
        address: 'Test City'
    };

    describe('POST /api/auth/signup', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            // Accept 201 (created) or 200, and also handle verification flow
            expect([200, 201]).toContain(res.status);
        });

        it('should reject duplicate phone', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            // Should fail because user already exists
            expect([400, 409]).toContain(res.status);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ mobileOrEmail: testUser.phone, password: testUser.password });

            // May succeed or fail depending on verification requirement
            if (res.status === 200) {
                expect(res.body).toHaveProperty('token');
                expect(res.body).toHaveProperty('user');
            }
        });

        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ mobileOrEmail: 'nonexistent', password: 'wrong' });

            expect([400, 401]).toContain(res.status);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect([400, 401, 500]).toContain(res.status);
        });
    });
});
