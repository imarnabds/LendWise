/**
 * Simplified API test — tests endpoints one at a time to isolate issues.
 */
const http = require('http');

function api(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, 'http://localhost:5000');
        const opts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };
        const req = http.request(opts, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        // 1. Login
        console.log('--- Step 1: Login ---');
        const loginRes = await api('POST', '/api/auth/login', {
            mobileOrEmail: '5555550000',
            password: 'test123'
        });
        console.log('Login status:', loginRes.status);
        if (loginRes.status !== 200) {
            console.log('Login failed:', JSON.stringify(loginRes.body));
            process.exit(1);
        }
        const token = loginRes.body.token;
        console.log('Token obtained ✅\n');

        // 2. Create a loan
        console.log('--- Step 2: Create loan ---');
        const createRes = await api('POST', '/api/loans', {
            borrowerName: 'Test Person',
            borrowerPhone: '7777777777',
            principalAmount: 50000,
            interestRate: 3,
            startDate: '2025-06-01',
            durationMonths: 12
        }, token);
        console.log('Create status:', createRes.status);
        console.log('Create body:', JSON.stringify(createRes.body).substring(0, 200), '\n');

        // 3. GET /api/loans with pagination
        console.log('--- Step 3: GET /api/loans?page=1&limit=2 ---');
        const loansRes = await api('GET', '/api/loans?page=1&limit=2', null, token);
        console.log('Status:', loansRes.status);
        console.log('Has data[]:', Array.isArray(loansRes.body.data));
        console.log('Has pagination:', !!loansRes.body.pagination);
        if (loansRes.body.pagination) {
            console.log('Pagination:', JSON.stringify(loansRes.body.pagination));
        }
        if (loansRes.body.data && loansRes.body.data[0]) {
            const l = loansRes.body.data[0];
            console.log('First loan keys:', Object.keys(l).join(', '));
            console.log('monthlyInterest:', l.monthlyInterest);
            console.log('totalPayable:', l.totalPayable);
            console.log('pendingInterest:', l.pendingInterest);
        }
        console.log('');

        // 4. GET /api/loans/dashboard
        console.log('--- Step 4: Dashboard ---');
        const dashRes = await api('GET', '/api/loans/dashboard', null, token);
        console.log('Status:', dashRes.status);
        console.log('Body keys:', Object.keys(dashRes.body).join(', '));
        console.log('totalBorrowers:', dashRes.body.totalBorrowers, '| monthlyInterest:', dashRes.body.monthlyInterest, '\n');

        // 5. GET /api/loans/pending
        console.log('--- Step 5: Pending ---');
        const pendRes = await api('GET', '/api/loans/pending?page=1&limit=5', null, token);
        console.log('Status:', pendRes.status);
        console.log('Has pendingPayments:', Array.isArray(pendRes.body.pendingPayments));
        console.log('Has pagination:', !!pendRes.body.pagination);
        console.log('');

        // 6. GET /api/payments
        console.log('--- Step 6: Payments ---');
        const payRes = await api('GET', '/api/payments?page=1&limit=5', null, token);
        console.log('Status:', payRes.status);
        console.log('Has payments:', Array.isArray(payRes.body.payments));
        console.log('Has pagination:', !!payRes.body.pagination);
        console.log('');

        // 7. GET /api/loans/borrower-history
        console.log('--- Step 7: Borrower History ---');
        const histRes = await api('GET', '/api/loans/borrower-history?page=1&limit=5', null, token);
        console.log('Status:', histRes.status);
        console.log('Has history:', Array.isArray(histRes.body.history));
        console.log('Has pagination:', !!histRes.body.pagination);
        console.log('');

        // 8. GET /api/payments/reports
        console.log('--- Step 8: Reports ---');
        const repRes = await api('GET', '/api/payments/reports', null, token);
        console.log('Status:', repRes.status);
        console.log('Body keys:', Object.keys(repRes.body).join(', '));
        console.log('');

        // 9. Sort test
        console.log('--- Step 9: Sort (principalAmount asc) ---');
        const sortRes = await api('GET', '/api/loans?sortBy=principalAmount&order=asc&limit=50', null, token);
        console.log('Status:', sortRes.status);
        if (sortRes.body.data && sortRes.body.data.length > 1) {
            const amounts = sortRes.body.data.map(l => l.principal);
            console.log('Principals:', amounts.join(', '));
            let ascending = true;
            for (let i = 1; i < amounts.length; i++) {
                if (amounts[i] < amounts[i - 1]) ascending = false;
            }
            console.log('Ascending order:', ascending ? '✅' : '❌');
        }
        console.log('');

        console.log('=== ALL TESTS COMPLETED ===');
    } catch (err) {
        console.error('FATAL ERROR:', err.message);
        console.error(err.stack);
    }
}

run();
