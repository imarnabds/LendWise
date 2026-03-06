const http = require('http');

async function testApi() {
    try {
        const loginData = JSON.stringify({
            mobileOrEmail: 'test@microlend.com',
            password: 'password'
        });

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const response = JSON.parse(data);
                if (response.token) {
                    http.get('http://localhost:5000/api/loans/pending', {
                        headers: { 'Authorization': `Bearer ${response.token}` }
                    }, (res2) => {
                        let data2 = '';
                        res2.on('data', chunk => data2 += chunk);
                        res2.on('end', () => {
                            const pendingData = JSON.parse(data2);
                            console.log('--- Pending Payments ---');
                            pendingData.pendingPayments.forEach(p => {
                                console.log(`${p.name} - Days Late: ${p.daysLate} - Status: ${p.status}`);
                            });
                        });
                    });
                } else {
                    console.log('Login failed:', data);
                }
            });
        });

        req.write(loginData);
        req.end();

    } catch (e) {
        console.error(e);
    }
}
testApi();
