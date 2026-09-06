const express = require('express');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const aiController = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', auth, aiLimiter, aiController.handleChat);

module.exports = router;
