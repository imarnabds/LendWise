const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Standardized JWT Token Generator.
 * Uses sub claim for user identity and embeds canonical role.
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            sub: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET || 'microlend_super_secret_key_2026',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Register a new User account.
 */
const signup = async ({ name, phone, email, password, address, role }) => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        const err = new Error('Name is required.');
        err.statusCode = 400;
        throw err;
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
        const err = new Error('Phone number is required.');
        err.statusCode = 400;
        throw err;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
        const err = new Error('Password must be at least 8 characters long.');
        err.statusCode = 400;
        throw err;
    }
    if (!role || typeof role !== 'string') {
        const err = new Error('Role is required.');
        err.statusCode = 400;
        throw err;
    }

    const normalizedRole = role.toUpperCase();
    if (!['LENDER', 'BORROWER'].includes(normalizedRole)) {
        const err = new Error('Invalid role. Role must be LENDER or BORROWER.');
        err.statusCode = 400;
        throw err;
    }

    const normalizedPhone = phone.trim().slice(-10);

    // Duplicate check for phone
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
        const err = new Error('User with this phone number already exists.');
        err.statusCode = 409;
        throw err;
    }

    // Duplicate check for email if provided
    if (email && email.trim().length > 0) {
        const normalizedEmail = email.trim().toLowerCase();
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
            const err = new Error('User with this email address already exists.');
            err.statusCode = 409;
            throw err;
        }
    }

    const user = new User({
        name: name.trim(),
        phone: normalizedPhone,
        email: email ? email.trim().toLowerCase() : '',
        password,
        address: address ? address.trim() : '',
        role: normalizedRole
    });

    await user.save();
    logger.info(`SIGNUP_SUCCESS: User ${user._id} registered as ${user.role}`);

    const token = generateToken(user);
    return { user, token };
};

/**
 * Authenticate User credentials and issue JWT.
 */
const login = async ({ mobileOrEmail, password }) => {
    if (!mobileOrEmail || !password) {
        const err = new Error('Mobile/Email and password are required.');
        err.statusCode = 400;
        throw err;
    }

    const cleanInput = String(mobileOrEmail).trim();
    const cleanPhone = cleanInput.slice(-10);

    const user = await User.findOne({
        $or: [
            { phone: cleanPhone },
            { phone: cleanInput },
            { email: cleanInput.toLowerCase() }
        ]
    }).select('+password');

    if (!user || !user.comparePassword(password)) {
        logger.warn(`LOGIN_FAILURE: Attempted login failed for identifier: ${cleanInput}`);
        const err = new Error('Invalid credentials.');
        err.statusCode = 401;
        throw err;
    }

    if (!user.isVerified) {
        const err = new Error('Please verify your account first.');
        err.statusCode = 401;
        throw err;
    }

    logger.info(`LOGIN_SUCCESS: User ${user._id} (${user.role}) logged in`);
    const token = generateToken(user);
    return { user, token };
};

/**
 * Get User profile by ID (excludes password).
 */
const getProfile = async (userId) => {
    const user = await User.findById(userId).select('-password');
    if (!user) {
        const err = new Error('User profile not found.');
        err.statusCode = 404;
        throw err;
    }
    return user;
};

/**
 * Update User profile using an explicit allowlist.
 * Explicitly rejects mutating identity/security/role properties.
 */
const updateProfile = async (userId, body) => {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('User profile not found.');
        err.statusCode = 404;
        throw err;
    }

    const allowedFields = ['name', 'email', 'phone', 'address', 'emailNotifications'];
    allowedFields.forEach(field => {
        if (body[field] !== undefined) {
            if (field === 'emailNotifications' && typeof body[field] === 'boolean') {
                user.emailNotifications = body[field];
            } else if (typeof body[field] === 'string') {
                if (field === 'email') {
                    user.email = body.email.trim().toLowerCase();
                } else if (field === 'phone') {
                    user.phone = body.phone.trim().slice(-10);
                } else {
                    user[field] = body[field].trim();
                }
            }
        }
    });

    await user.save();
    logger.info(`PROFILE_UPDATE: User ${userId} updated profile`);
    return user;
};

/**
 * Securely change User password.
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
    if (!currentPassword || !newPassword) {
        const err = new Error('Current and new passwords are required.');
        err.statusCode = 400;
        throw err;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        const err = new Error('New password must be at least 8 characters long.');
        err.statusCode = 400;
        throw err;
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    if (!user.comparePassword(currentPassword)) {
        logger.warn(`AUTH_ERROR: Password change failed for User ${userId} (incorrect current password)`);
        const err = new Error('Current password is incorrect.');
        err.statusCode = 400;
        throw err;
    }

    user.password = newPassword;
    await user.save();
    logger.info(`PASSWORD_CHANGE: User ${userId} updated password successfully`);
};

/**
 * Firebase Phone Auth.
 */
const firebasePhoneAuth = async ({ idToken, role, name, countryCode }) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;
    if (!phoneNumber) throw new Error('No phone number found in Firebase token.');

    const normalizedPhone = phoneNumber.slice(-10);
    const firebaseUid = decodedToken.uid;

    let user = await User.findOne({
        $or: [
            { phone: normalizedPhone },
            { phone: phoneNumber },
            { firebaseUid }
        ]
    });

    if (user) {
        if (!user.firebaseUid) {
            user.firebaseUid = firebaseUid;
            user.authProvider = user.authProvider || 'phone';
            await user.save();
        }
        return { user, token: generateToken(user), isNewUser: false };
    }

    if (!role || !['LENDER', 'BORROWER'].includes(role.toUpperCase())) {
        return { isNewUser: true, needsRole: true };
    }

    user = new User({
        name: name || `User ${normalizedPhone.slice(-4)}`,
        phone: normalizedPhone,
        countryCode: countryCode || '+91',
        authProvider: 'phone',
        firebaseUid,
        role: role.toUpperCase(),
        isVerified: true
    });

    await user.save();
    return { user, token: generateToken(user), isNewUser: true };
};

/**
 * Firebase Google Auth.
 */
const firebaseGoogleAuth = async ({ idToken, role }) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;
    if (!email) throw new Error('No email found in Firebase token.');

    const firebaseUid = decodedToken.uid;
    const displayName = decodedToken.name || decodedToken.email.split('@')[0];
    const photoURL = decodedToken.picture || '';

    let user = await User.findOne({
        $or: [
            { email: email.toLowerCase() },
            { firebaseUid }
        ]
    });

    if (user) {
        let needsSave = false;
        if (!user.firebaseUid) { user.firebaseUid = firebaseUid; needsSave = true; }
        if (photoURL && user.photoURL !== photoURL) { user.photoURL = photoURL; needsSave = true; }
        if (displayName && !user.name.includes(displayName.split(' ')[0])) {
            if (user.name.startsWith('User ')) { user.name = displayName; needsSave = true; }
        }
        if (needsSave) await user.save();
        return { user, token: generateToken(user), isNewUser: false };
    }

    if (!role || !['LENDER', 'BORROWER'].includes(role.toUpperCase())) {
        return { isNewUser: true, needsRole: true, googleProfile: { name: displayName, email, photoURL } };
    }

    user = new User({
        name: displayName,
        email: email.toLowerCase(),
        photoURL,
        authProvider: 'google',
        firebaseUid,
        role: role.toUpperCase(),
        isVerified: true
    });

    await user.save();
    return { user, token: generateToken(user), isNewUser: true };
};

module.exports = {
    generateToken,
    signup,
    login,
    getProfile,
    updateProfile,
    changePassword,
    firebasePhoneAuth,
    firebaseGoogleAuth
};
