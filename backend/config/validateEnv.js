const logger = require('../utils/logger');

const validateEnv = () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        logger.error('❌ FATAL: MONGO_URI / MONGODB_URI environment variable is missing.');
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        logger.error('❌ FATAL: JWT_SECRET environment variable is missing.');
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }

    if (process.env.NODE_ENV === 'production') {
        const insecureSecrets = ['default_secret', 'secret', '123456', 'microlend_super_secret_key_2026', 'change_me'];
        if (insecureSecrets.includes(jwtSecret)) {
            logger.error('❌ FATAL: Insecure JWT_SECRET detected in production environment.');
            process.exit(1);
        }
    }
};

module.exports = validateEnv;
