/**
 * Rate Limiter Middleware.
 * Standard Rate Limiter: Limits each IP to 100 requests per 15-minute window.
 * Auth Rate Limiter: Limits login/signup attempts to 5 requests per 15-minute window per IP.
 */

const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
    }
});

const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,                    // 20 attempts per 15 min window
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        message: 'Too many AI chat requests, please try again after 15 minutes.'
    }
});

module.exports = {
    rateLimiter,
    authLimiter,
    aiLimiter
};
