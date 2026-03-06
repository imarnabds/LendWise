/**
 * Centralized error-handling middleware.
 * Catches all errors thrown in routes / controllers / services
 * and returns a consistent JSON response.
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log the error
    if (statusCode >= 500) {
        logger.error(`${statusCode} ${req.method} ${req.originalUrl} — ${message}`, {
            stack: err.stack,
            body: req.body,
            user: req.user?.id
        });
    } else {
        logger.warn(`${statusCode} ${req.method} ${req.originalUrl} — ${message}`);
    }

    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;
