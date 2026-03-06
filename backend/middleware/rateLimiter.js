/**
 * Rate Limiter Middleware.
 * Limits each IP to 100 requests per 15-minute window.
 */

const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // 100 requests per window
    standardHeaders: true,      // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,       // Disable X-RateLimit-* headers
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes.'
    }
});

module.exports = rateLimiter;
