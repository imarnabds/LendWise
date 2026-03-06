const express = require('express');
const router = express.Router();

// In-memory store for verification sessions (use Redis in production)
const verificationSessions = new Map();

// POST /api/verify/initiate — Start phone verification
router.post('/initiate', (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required.' });
    }

    // Clean phone (remove spaces, dashes)
    const cleanPhone = phone.replace(/[\s\-]/g, '');

    // Create session
    const sessionId = `d2v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const missedCallNumber = process.env.DIAL2VERIFY_NUMBER || '080-6733-1892';
    const mode = process.env.DIAL2VERIFY_MODE || 'simulation';

    verificationSessions.set(sessionId, {
        phone: cleanPhone,
        status: 'pending',    // pending | verified | expired
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000  // 5-minute expiry
    });

    // In live mode, you'd call Dial2Verify API here to register the callback
    // For now, we return the missed call number for the user to call
    if (mode === 'live') {
        // TODO: Call Dial2Verify HTTP API to register webhook
        // Example: GET https://dial2verify.com/api/verify?apikey=KEY&phone=PHONE&callback=URL
        console.log(`[Dial2Verify LIVE] Initiated verification for ${cleanPhone}, session: ${sessionId}`);
    } else {
        console.log(`[Dial2Verify SIM] Initiated verification for ${cleanPhone}, session: ${sessionId}`);
        // In simulation mode, user must click "I've made the call" button on the frontend
        // which calls POST /api/verify/simulate/:sessionId to manually verify
    }

    res.json({
        message: 'Verification initiated. Please give a missed call to the number shown.',
        sessionId,
        missedCallNumber,
        mode,
        expiresIn: 300 // seconds
    });
});

// GET /api/verify/status/:sessionId — Poll verification status
router.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = verificationSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found.', status: 'expired' });
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
        session.status = 'expired';
        verificationSessions.delete(sessionId);
        return res.json({ status: 'expired', message: 'Verification session expired.' });
    }

    res.json({
        status: session.status,
        phone: session.phone
    });
});

// POST /api/verify/webhook — Dial2Verify callback (called by Dial2Verify servers)
router.post('/webhook', (req, res) => {
    // Dial2Verify sends: caller (phone that made the missed call), number (your Dial2Verify number)
    const callerPhone = req.body.caller || req.query.caller || '';
    const cleanCaller = callerPhone.replace(/[\s\-\+]/g, '').slice(-10); // last 10 digits

    console.log(`[Dial2Verify Webhook] Received missed call from: ${callerPhone} (clean: ${cleanCaller})`);

    // Find matching pending session
    for (const [sessionId, session] of verificationSessions.entries()) {
        const sessionPhone = session.phone.slice(-10);
        if (sessionPhone === cleanCaller && session.status === 'pending') {
            session.status = 'verified';
            console.log(`[Dial2Verify Webhook] Verified session ${sessionId} for phone ${cleanCaller}`);
            break;
        }
    }

    // Dial2Verify expects a 200 OK
    res.json({ status: 'ok' });
});

// POST /api/verify/simulate — Dev-only: manually mark a session as verified
router.post('/simulate/:sessionId', (req, res) => {
    if (process.env.DIAL2VERIFY_MODE !== 'simulation') {
        return res.status(403).json({ message: 'Simulation not available in live mode.' });
    }

    const session = verificationSessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ message: 'Session not found.' });
    }

    session.status = 'verified';
    res.json({ status: 'verified', message: 'Phone verified (simulated).' });
});

module.exports = router;
