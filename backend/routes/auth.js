const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { name, phone, email, password, address, role } = req.body;

        if (!name || !phone || !password || !role) {
            return res.status(400).json({ message: 'Name, phone, password, and role are required.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ phone });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this phone number already exists.' });
        }

        // Create new user (isVerified defaults to true now)
        const user = new User({
            name,
            phone,
            email: email || '',
            password,
            address: address || '',
            role
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Signup error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

        // Handle Mongoose validation errors nicely
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }

        res.status(500).json({ message: 'Server error during signup.', error: error.message || error });
    }
});



// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { mobileOrEmail, password } = req.body;

        if (!mobileOrEmail || !password) {
            return res.status(400).json({ message: 'Mobile/Email and password are required.' });
        }

        // Find user by phone or email
        const user = await User.findOne({
            $or: [
                { phone: mobileOrEmail },
                { email: mobileOrEmail.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Please verify your account first.' });
        }

        const isMatch = user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: `Welcome back, ${user.name}!`,
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// GET /api/auth/me - Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -otp -otpExpiry');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// PUT /api/auth/profile - Update profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;

        await user.save();

        res.json({
            message: 'Profile updated successfully.',
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during profile update.' });
    }
});

// PUT /api/auth/password - Change password
router.put('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during password change.' });
    }
});

module.exports = router;
