/**
 * Socket.IO JWT Authentication Middleware
 *
 * Verifies JWT token supplied in handshake auth ({ token }) or Authorization header.
 * Attaches verified user identity { id, role } to socket.user.
 * Rejects unauthenticated connection attempts.
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const socketAuthMiddleware = (socket, next) => {
    try {
        let token = socket.handshake.auth?.token;

        // Fallback to Authorization header if present
        if (!token && socket.handshake.headers?.authorization) {
            const authHeader = socket.handshake.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            logger.warn('Socket Auth Failure: Missing token in handshake');
            const err = new Error('Authentication error: Token required');
            err.data = { code: 'UNAUTHORIZED' };
            return next(err);
        }

        const secret = process.env.JWT_SECRET || 'microlend_jwt_secret_key_2026';
        const decoded = jwt.verify(token, secret);

        const userId = (decoded.sub || decoded.id || '').toString();
        if (!userId) {
            logger.warn('Socket Auth Failure: Invalid token payload format');
            const err = new Error('Authentication error: Invalid user identity in token');
            err.data = { code: 'UNAUTHORIZED' };
            return next(err);
        }

        // Attach trusted identity derived strictly from verified JWT
        socket.user = {
            id: userId,
            role: decoded.role
        };

        logger.info(`Socket Auth Success: User ${socket.user.id} (${socket.user.role}) connected on socket ${socket.id}`);
        return next();
    } catch (error) {
        logger.warn(`Socket Auth Failure: ${error.message}`);
        const err = new Error('Authentication error: Invalid or expired token');
        err.data = { code: 'UNAUTHORIZED' };
        return next(err);
    }
};

module.exports = socketAuthMiddleware;
