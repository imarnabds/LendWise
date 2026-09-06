/**
 * Jest test setup — shared app instance and DB helpers.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoSanitize = require('express-mongo-sanitize');

dotenv.config();

const errorHandler = require('../middleware/errorHandler');

// Create fresh Express app for testing (no .listen())
const createApp = () => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Express 5 NoSQL injection sanitization
    app.use((req, res, next) => {
        if (req.body) req.body = mongoSanitize.sanitize(req.body);
        if (req.query) req.query = mongoSanitize.sanitize(req.query);
        next();
    });

    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/loans', require('../routes/loans'));
    app.use('/api/payments', require('../routes/payments'));
    app.use('/api/ai', require('../routes/ai'));
    app.use('/api/reports', require('../routes/reports'));

    app.get('/api/health', (req, res) => {
        const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        const mem = process.memoryUsage();
        res.json({
            status: dbState === 'connected' ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'test',
            version: require('../package.json').version,
            nodeVersion: process.version,
            services: { database: dbState, redis: 'disabled/disconnected' },
            memory: {
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
                rssMB: Math.round(mem.rss / 1024 / 1024),
                externalMB: Math.round(mem.external / 1024 / 1024)
            }
        });
    });

    app.use(errorHandler);
    return app;
};

// Connect to test DB safely
const connectDB = async () => {
    if (mongoose.connection.readyState === 0) {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/microlend_test';
        await mongoose.connect(uri);
    }
};

// Disconnect safely
const disconnectDB = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
};

// Clean specific collections
const cleanCollections = async (...names) => {
    if (mongoose.connection.readyState === 1) {
        for (const name of names) {
            const collection = mongoose.connection.collections[name];
            if (collection) await collection.deleteMany({});
        }
    }
};

module.exports = { createApp, connectDB, disconnectDB, cleanCollections };
