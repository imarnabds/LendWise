/**
 * Firebase Admin SDK — server-side initialization.
 *
 * Supports two configuration methods:
 *   1. FIREBASE_SERVICE_ACCOUNT_PATH — path to a JSON key file (local dev)
 *   2. FIREBASE_SERVICE_ACCOUNT_JSON — inline JSON string (cloud deploys)
 *
 * If neither is set, the SDK initialises without credentials (phone-OTP
 * token verification will fail, but the rest of the app keeps working).
 */

const admin = require('firebase-admin');
const path = require('path');
const logger = require('../utils/logger');

let serviceAccount;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        // Cloud / CI: parse inline JSON from environment variable
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        // Local dev: load from file on disk
        serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    }
} catch (err) {
    logger.error(`Failed to load Firebase service account: ${err.message}`);
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    logger.info('🔥 Firebase Admin SDK initialized successfully');
} else {
    logger.warn('⚠️  Firebase Admin SDK not configured — phone OTP auth disabled.');
    logger.warn('   Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env');
}

module.exports = admin;
