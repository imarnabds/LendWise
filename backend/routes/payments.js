const express = require('express');
const auth = require('../middleware/auth');
const { validatePaymentQuery } = require('../middleware/validate');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── Payment Routes ────────────────────────────────────────
// POST /api/payments          — Record a payment
// GET  /api/payments          — Paginated payment history
// GET  /api/payments/reports  — Revenue & analytics
// GET  /api/payments/:id      — Single payment detail (Authorized for Lender/Borrower of Loan)

router.post('/', paymentController.recordPayment);
router.get('/', validatePaymentQuery, paymentController.getPayments);
router.get('/reports', paymentController.getReports);
router.get('/:id', paymentController.getPaymentById);

module.exports = router;
