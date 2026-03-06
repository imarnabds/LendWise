const express = require('express');
const auth = require('../middleware/auth');
const { validateLoanQuery } = require('../middleware/validate');
const loanController = require('../controllers/loanController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── Loan Routes ───────────────────────────────────────────
// POST   /api/loans                — Create a new loan (Add Borrower)
// GET    /api/loans                — Paginated, filtered, sorted loan listing
// GET    /api/loans/dashboard      — Aggregated dashboard stats
// GET    /api/loans/pending        — Pending/overdue payments
// GET    /api/loans/borrower-history — Soft-deleted borrowers history
// GET    /api/loans/:id            — Single loan detail
// PUT    /api/loans/:id            — Update loan
// DELETE /api/loans/:id            — Soft-delete loan

router.post('/', loanController.createLoan);
router.get('/', validateLoanQuery, loanController.getLoans);
router.get('/dashboard', loanController.getDashboard);
router.get('/pending', validateLoanQuery, loanController.getPendingPayments);
router.get('/borrower-history', validateLoanQuery, loanController.getBorrowerHistory);
router.get('/:id', loanController.getLoanById);
router.put('/:id', loanController.updateLoan);
router.delete('/:id', loanController.deleteLoan);

module.exports = router;
