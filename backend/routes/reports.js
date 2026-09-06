const express = require('express');
const auth = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/pdf', auth, reportController.exportPdf);
router.get('/excel', auth, reportController.exportExcel);

module.exports = router;
