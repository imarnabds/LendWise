/**
 * smoke_test.js — Production Smoke Test Suite
 *
 * Exercises all critical paths against a LIVE running server.
 * Requires the server to already be running (npm start).
 *
 * Tests:
 *   1. Health endpoint
 *   2. Authentication (signup, login, JWT validation, role guard)
 *   3. Lender flows (create loan, list loans, dashboard)
 *   4. Borrower flows (list loans, single loan view)
 *   5. Payment flows (record, history, reports)
 *   6. Authorization (IDOR rejection, mass assignment rejection)
 *   7. Socket.IO connection (authenticate, join room, event receipt)
 *
 * Usage:
 *   BASE_URL=http://localhost:5000 node smoke_test.js
 *   BASE_URL=https://your.production.domain node smoke_test.js
 *
 * Exits 0 if all tests pass. Exits 1 on any failure.
 */

const http = require('http');
const https = require('https');
const { io: ioClient } = require('socket.io-client');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const isHttps = BASE_URL.startsWith('https');

// ── HTTP helper ──────────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        const payload = body ? JSON.stringify(body) : null;
        if (payload) options.headers['Content-Length'] = Buffer.byteLength(payload);

        const lib = isHttps ? https : http;
        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// ── Test runner ──────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let currentSuite = '';

function suite(name) {
    currentSuite = name;
    console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 60 - name.length))}`);
}

function assert(label, condition, details = '') {
    if (condition) {
        console.log(`  ✅  ${label}`);
        passed++;
    } else {
        console.log(`  ❌  ${label}${details ? ' — ' + details : ''}`);
        failed++;
    }
}

// Unique suffix so test accounts don't collide with existing data
const suffix = Date.now().toString().slice(-6);

async function run() {
    console.log(`\n${'═'.repeat(64)}`);
    console.log(`  LENDWISE PRODUCTION SMOKE TEST`);
    console.log(`  Target: ${BASE_URL}`);
    console.log(`  Time:   ${new Date().toISOString()}`);
    console.log(`${'═'.repeat(64)}`);

    // ── 1. Health ──────────────────────────────────────────────────────
    suite('1. Health Endpoint');
    const health = await request('GET', '/api/health');
    assert('GET /api/health returns 200', health.status === 200, `got ${health.status}`);
    assert('status is healthy', health.body.status === 'healthy', `got ${health.body.status}`);
    assert('database is connected', health.body.services?.database === 'connected', `got ${health.body.services?.database}`);
    assert('uptimeSeconds present', typeof health.body.uptimeSeconds === 'number');
    assert('timestamp present', typeof health.body.timestamp === 'string');

    // ── 2. Authentication ──────────────────────────────────────────────
    suite('2. Authentication');

    const lenderPhone   = `91${suffix}01`;
    const borrowerPhone = `91${suffix}02`;

    const lenderSignup = await request('POST', '/api/auth/signup', {
        name: `Smoke Lender ${suffix}`, phone: lenderPhone,
        password: 'SmokePass123!', role: 'LENDER'
    });
    assert('Lender signup returns 201', lenderSignup.status === 201, `got ${lenderSignup.status}`);

    const borrowerSignup = await request('POST', '/api/auth/signup', {
        name: `Smoke Borrower ${suffix}`, phone: borrowerPhone,
        password: 'SmokePass123!', role: 'BORROWER'
    });
    assert('Borrower signup returns 201', borrowerSignup.status === 201, `got ${borrowerSignup.status}`);

    const lenderLogin = await request('POST', '/api/auth/login', {
        mobileOrEmail: lenderPhone, password: 'SmokePass123!'
    });
    assert('Lender login returns 200', lenderLogin.status === 200, `got ${lenderLogin.status}`);
    assert('Lender JWT present', typeof lenderLogin.body.token === 'string');
    assert('Lender role correct', lenderLogin.body.user?.role === 'LENDER');
    const lenderToken = lenderLogin.body.token;
    const lenderUser  = lenderLogin.body.user;

    const borrowerLogin = await request('POST', '/api/auth/login', {
        mobileOrEmail: borrowerPhone, password: 'SmokePass123!'
    });
    assert('Borrower login returns 200', borrowerLogin.status === 200);
    assert('Borrower JWT present', typeof borrowerLogin.body.token === 'string');
    const borrowerToken = borrowerLogin.body.token;
    const borrowerUser  = borrowerLogin.body.user;

    // Rejected auth
    const noToken = await request('GET', '/api/loans');
    assert('Missing token → 401', noToken.status === 401, `got ${noToken.status}`);

    const badToken = await request('GET', '/api/loans', null, 'bad.token.value');
    assert('Malformed token → 401', badToken.status === 401, `got ${badToken.status}`);

    const meRes = await request('GET', '/api/auth/me', null, lenderToken);
    assert('GET /api/auth/me returns authenticated user', meRes.status === 200 && meRes.body.user?.role === 'LENDER');

    // ── 3. Lender Flows ────────────────────────────────────────────────
    suite('3. Lender Flows');

    const createRes = await request('POST', '/api/loans', {
        borrowerPhone: borrowerPhone,
        borrowerName: `Smoke Borrower ${suffix}`,
        principalAmount: 10000,
        interestRate: 12,
        startDate: new Date().toISOString().split('T')[0],
        durationMonths: 12
    }, lenderToken);
    assert('Create loan returns 201', createRes.status === 201, `got ${createRes.status}: ${JSON.stringify(createRes.body?.message)}`);
    // lenderId comes back as an ObjectId string; lenderUser.id is the JWT subject string
    const returnedLenderId = createRes.body.loan?.lenderId?.toString();
    const actorId = (lenderUser._id || lenderUser.id)?.toString();
    assert('Loan lenderId is authenticated user', returnedLenderId === actorId, `lenderId=${returnedLenderId}, actorId=${actorId}`);
    assert('Loan amountPaid starts at 0', createRes.body.loan?.amountPaid === 0);
    assert('Loan remainingBalance = totalPayable', createRes.body.loan?.remainingBalance === createRes.body.loan?.totalPayable);
    const loanId = createRes.body.loan?._id;

    const loansRes = await request('GET', '/api/loans', null, lenderToken);
    assert('GET /api/loans returns 200', loansRes.status === 200, `got ${loansRes.status}`);
    assert('Loans array present', Array.isArray(loansRes.body.data));
    assert('Created loan appears in list', loansRes.body.data?.some(l => l.loanId?.toString() === loanId?.toString()));

    const singleLoan = await request('GET', `/api/loans/${loanId}`, null, lenderToken);
    assert('GET /api/loans/:id returns 200', singleLoan.status === 200);
    assert('Loan _id matches', singleLoan.body.loan?._id?.toString() === loanId?.toString());

    const dashRes = await request('GET', '/api/loans/dashboard', null, lenderToken);
    assert('GET /api/loans/dashboard returns 200', dashRes.status === 200, `got ${dashRes.status}`);
    assert('Dashboard has totalAmountLent', typeof dashRes.body.totalAmountLent === 'number');

    // ── 4. Borrower Flows ──────────────────────────────────────────────
    suite('4. Borrower Flows');

    const borrowerLoans = await request('GET', '/api/loans', null, borrowerToken);
    assert('Borrower GET /api/loans returns 200', borrowerLoans.status === 200);
    assert('Borrower sees their loan', borrowerLoans.body.data?.some(l => l.loanId?.toString() === loanId?.toString()));

    const borrowerSingle = await request('GET', `/api/loans/${loanId}`, null, borrowerToken);
    assert('Borrower can view their own loan', borrowerSingle.status === 200);

    // ── 5. Payment Flows ───────────────────────────────────────────────
    suite('5. Payment Flows');

    const payRes = await request('POST', '/api/payments', {
        loanId, amount: 2000, paymentDate: new Date().toISOString().split('T')[0]
    }, borrowerToken);
    assert('Record payment returns 201', payRes.status === 201, `got ${payRes.status}: ${JSON.stringify(payRes.body?.message)}`);
    assert('updatedBalance is totalPayable − 2000', Math.abs(payRes.body.updatedBalance - (createRes.body.loan.totalPayable - 2000)) < 0.05);
    assert('loanStatus is Active or Closed', ['Active', 'Overdue', 'Closed'].includes(payRes.body.loanStatus));

    const payHistRes = await request('GET', '/api/payments', null, lenderToken);
    assert('GET /api/payments returns 200', payHistRes.status === 200);
    assert('Payment history is array', Array.isArray(payHistRes.body.payments));

    const reportsRes = await request('GET', '/api/payments/reports', null, lenderToken);
    assert('GET /api/payments/reports returns 200', reportsRes.status === 200);
    assert('Reports has revenueTrend', Array.isArray(reportsRes.body.revenueTrend));

    // Overpayment rejection
    const overPay = await request('POST', '/api/payments', {
        loanId, amount: 999999, paymentDate: new Date().toISOString().split('T')[0]
    }, borrowerToken);
    assert('Overpayment rejected with 400', overPay.status === 400);

    // ── 6. Authorization Boundaries ────────────────────────────────────
    suite('6. Authorization');

    // Create a second lender to test IDOR
    const lender2Phone = `91${suffix}03`;
    await request('POST', '/api/auth/signup', {
        name: `Smoke Lender2 ${suffix}`, phone: lender2Phone,
        password: 'SmokePass123!', role: 'LENDER'
    });
    const l2Login  = await request('POST', '/api/auth/login', {
        mobileOrEmail: lender2Phone, password: 'SmokePass123!'
    });
    const lender2Token = l2Login.body.token;
    if (!lender2Token) {
        assert('Unrelated lender accessing loan → 403', false, 'Could not obtain second lender token');
        // skip the IDOR test if we have no token
    } else {

    const idorLoan = await request('GET', `/api/loans/${loanId}`, null, lender2Token);
    assert('Unrelated lender accessing loan → 403', idorLoan.status === 403, `got ${idorLoan.status}`);
    }

    const borrowerDelete = await request('DELETE', `/api/loans/${loanId}`, null, borrowerToken);
    assert('Borrower attempting soft-delete → 403', borrowerDelete.status === 403);

    const borrowerUpdate = await request('PUT', `/api/loans/${loanId}`, { notes: 'hacked' }, borrowerToken);
    assert('Borrower attempting metadata update → 403', borrowerUpdate.status === 403);

    const badObjectId = await request('GET', '/api/loans/000notanobjectid', null, lenderToken);
    assert('Malformed ObjectId → 400', badObjectId.status === 400);

    const roleForge = await request('PUT', '/api/auth/profile', { role: 'LENDER' }, borrowerToken);
    assert('Role forge in profile update ignored', roleForge.status === 200 && roleForge.body.user?.role === 'BORROWER');

    // ── 7. Socket.IO ───────────────────────────────────────────────────
    suite('7. Socket.IO');

    const socketResult = await new Promise((resolve) => {
        const results = { connected: false, badTokenRejected: false, roomJoined: false };

        // Test valid connection
        const socket = ioClient(BASE_URL, {
            auth: { token: lenderToken },
            transports: ['websocket'],
            timeout: 5000
        });

        socket.on('connect', () => {
            results.connected = true;
            // Test room join
            socket.emit('joinLoan', loanId, (ack) => {
                if (ack && (ack.status === 'ok' || ack.roomId)) {
                    results.roomJoined = true;
                }
                socket.disconnect();
                resolve(results);
            });
            // Fallback timeout
            setTimeout(() => { socket.disconnect(); resolve(results); }, 3000);
        });

        socket.on('connect_error', () => {
            socket.disconnect();
            resolve(results);
        });
    });

    assert('Socket.IO connects with valid token', socketResult.connected);
    assert('Socket.IO joins loan room', socketResult.roomJoined);

    const badSocketResult = await new Promise((resolve) => {
        const s = ioClient(BASE_URL, {
            auth: { token: 'invalid.bad.token' },
            transports: ['websocket'],
            timeout: 5000
        });
        let rejected = false;
        s.on('connect_error', () => { rejected = true; s.disconnect(); resolve(rejected); });
        s.on('connect', () => { s.disconnect(); resolve(false); });
        setTimeout(() => { s.disconnect(); resolve(rejected); }, 5000);
    });
    assert('Socket.IO rejects invalid token', badSocketResult);

    // ── Final Summary ──────────────────────────────────────────────────
    const total = passed + failed;
    console.log('\n' + '═'.repeat(64));
    console.log(`  SMOKE TEST RESULTS`);
    console.log(`  Passed: ${passed} / ${total}`);
    console.log(`  Failed: ${failed} / ${total}`);
    if (failed === 0) {
        console.log('\n  ✅  ALL SMOKE TESTS PASSED — PRODUCTION IS OPERATIONAL');
        console.log('  🟢  FINAL DECISION: GO');
    } else {
        console.log('\n  ❌  SOME SMOKE TESTS FAILED — INVESTIGATE BEFORE DECLARING PRODUCTION READY');
        console.log('  🔴  FINAL DECISION: HOLD');
    }
    console.log('═'.repeat(64) + '\n');
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('\nSmoke test runner crashed:', err.message);
    process.exit(1);
});
