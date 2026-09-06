const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    try {
        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000
        });
        logger.info(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`❌ MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
