/**
 * Jest test setup — shared app instance and DB helpers.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const errorHandler = require('../middleware/errorHandler');

// Create fresh Express app for testing (no .listen())
const createApp = () => {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/loans', require('../routes/loans'));
    app.use('/api/payments', require('../routes/payments'));

    app.use(errorHandler);
    return app;
};

// Connect to test DB
const connectDB = async () => {
    const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/microlend_test';
    await mongoose.connect(uri);
};

// Disconnect
const disconnectDB = async () => {
    await mongoose.connection.close();
};

// Clean specific collections
const cleanCollections = async (...names) => {
    for (const name of names) {
        const collection = mongoose.connection.collections[name];
        if (collection) await collection.deleteMany({});
    }
};

module.exports = { createApp, connectDB, disconnectDB, cleanCollections };
