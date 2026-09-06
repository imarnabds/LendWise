const authService = require('../services/authService');

const formatUser = (user) => ({
    _id: user._id,
    id: user._id,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    address: user.address || '',
    emailNotifications: user.emailNotifications !== false,
    photoURL: user.photoURL || ''
});

const signup = async (req, res, next) => {
    try {
        const { name, phone, email, password, address, role } = req.body;
        const { user, token } = await authService.signup({ name, phone, email, password, address, role });
        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: formatUser(user)
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { mobileOrEmail, password } = req.body;
        const { user, token } = await authService.login({ mobileOrEmail, password });
        res.json({
            message: `Welcome back, ${user.name}!`,
            token,
            user: formatUser(user)
        });
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await authService.getProfile(req.user.id);
        res.json({ user: formatUser(user) });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const user = await authService.updateProfile(req.user.id, req.body);
        res.json({
            message: 'Profile updated successfully.',
            user: formatUser(user)
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(req.user.id, { currentPassword, newPassword });
        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        next(error);
    }
};

const firebasePhoneAuth = async (req, res, next) => {
    try {
        const { idToken, role, name, countryCode } = req.body;
        if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required.' });

        const result = await authService.firebasePhoneAuth({ idToken, role, name, countryCode });

        if (result.needsRole) {
            return res.status(400).json({ message: 'Role is required for new users.', isNewUser: true });
        }

        const status = result.isNewUser ? 201 : 200;
        const msg = result.isNewUser ? 'Account created successfully!' : `Welcome back, ${result.user.name}!`;

        res.status(status).json({
            message: msg,
            token: result.token,
            user: formatUser(result.user)
        });
    } catch (error) {
        next(error);
    }
};

const firebaseGoogleAuth = async (req, res, next) => {
    try {
        const { idToken, role } = req.body;
        if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required.' });

        const result = await authService.firebaseGoogleAuth({ idToken, role });

        if (result.needsRole) {
            return res.status(400).json({
                message: 'Role is required for new users.',
                isNewUser: true,
                googleProfile: result.googleProfile
            });
        }

        const status = result.isNewUser ? 201 : 200;
        const msg = result.isNewUser ? 'Account created successfully!' : `Welcome back, ${result.user.name}!`;

        res.status(status).json({
            message: msg,
            token: result.token,
            user: formatUser(result.user)
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    login,
    getProfile,
    updateProfile,
    changePassword,
    firebasePhoneAuth,
    firebaseGoogleAuth
};
