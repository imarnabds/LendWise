const express = require('express');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.get('/me', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.put('/password', auth, authController.changePassword);

router.post('/firebase-phone', authLimiter, authController.firebasePhoneAuth);
router.post('/firebase-google', authLimiter, authController.firebaseGoogleAuth);

module.exports = router;
