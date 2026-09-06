const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware.
 * Reads Authorization header, verifies JWT signature & expiration,
 * and attaches verified identity to req.user = { id, role }.
 */
const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'microlend_super_secret_key_2026');

        const userId = decoded.sub || decoded.id;
        if (!userId) {
            return res.status(401).json({ message: 'Invalid token payload.' });
        }

        req.user = {
            id: userId,
            role: decoded.role
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

/**
 * Role-based Authorization Middleware.
 * Ensures the authenticated actor has one of the allowed roles.
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'Access denied. Unauthenticated.' });
        }

        const normalizedRole = req.user.role.toUpperCase();
        const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

        if (!normalizedAllowed.includes(normalizedRole)) {
            return res.status(403).json({ message: `Access denied. Requires role: ${allowedRoles.join(' or ')}.` });
        }

        next();
    };
};

module.exports = auth;
module.exports.requireRole = requireRole;
