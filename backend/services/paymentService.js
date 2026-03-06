/**
 * Payment Service — all business logic for payment operations.
 *
 * Responsibilities:
 *  - Recording payments and updating loan balances
 *  - Paginated, filterable payment history
 *  - Revenue / analytics reports (aggregation pipeline)
 */

const Payment = require('../models/Payment');
const Loan = require('../models/Loan');
const { getCache, setCache, invalidatePattern } = require('../config/redis');
const logger = require('../utils/logger');

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const buildPaginationMeta = (totalRecords, page, limit) => ({
    currentPage: page,
    totalPages: Math.ceil(totalRecords / limit) || 1,
    totalRecords,
    limit
});

// ────────────────────────────────────────────────────────────
// Service Methods
// ────────────────────────────────────────────────────────────

/**
 * POST /api/payments — Record a payment.
 */
const recordPayment = async (lenderId, body) => {
    const { loanId, amount, interestPortion, paymentDate, mode } = body;

    if (!loanId || !amount || !paymentDate) {
        const err = new Error('Loan ID, amount, and payment date are required.');
        err.statusCode = 400;
        throw err;
    }

    const loan = await Loan.findOne({ _id: loanId, lender: lenderId });
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    const payment = new Payment({
        loan: loanId,
        lender: lenderId,
        borrowerName: loan.borrowerName,
        amount: parseFloat(amount),
        interestPortion: parseFloat(interestPortion || 0),
        paymentDate: new Date(paymentDate),
        mode: mode || 'Cash',
        status: 'Completed',
        type: 'EMI Payment'
    });

    await payment.save();

    // Update loan remaining balance and status
    loan.remainingBalance = Math.max(0, loan.remainingBalance - parseFloat(amount));
    if (loan.remainingBalance <= 0) {
        loan.status = 'Closed';
    } else if (loan.status === 'Overdue') {
        loan.status = 'Active';
    }
    await loan.save();

    logger.info(`Payment recorded: ₹${amount} for ${loan.borrowerName}`);
    // Invalidate related caches
    await invalidatePattern(`loans:${lenderId}:*`);
    await invalidatePattern(`dashboard:${lenderId}`);
    await invalidatePattern(`reports:${lenderId}`);

    return {
        message: `Payment of ₹${amount} recorded for ${loan.borrowerName}`,
        payment,
        updatedBalance: loan.remainingBalance
    };
};

/**
 * GET /api/payments — Paginated, filtered payment history.
 */
const getPayments = async (lenderId, { pagination, filters }) => {
    const { page, limit } = pagination;

    // ── Build filter ───────────────────────────────────────
    const query = { lender: lenderId };

    if (filters.search) {
        query.borrowerName = { $regex: filters.search, $options: 'i' };
    }
    if (filters.status) {
        query.status = filters.status;
    }

    // ── Count + Fetch in parallel ──────────────────────────
    const skip = (page - 1) * limit;

    const [totalRecords, payments] = await Promise.all([
        Payment.countDocuments(query),
        Payment.find(query)
            .select('reference paymentDate borrowerName type amount mode status')
            .sort({ paymentDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    const data = payments.map(p => ({
        id: p.reference || `TXN-${p._id.toString().slice(-3).toUpperCase()}`,
        date: p.paymentDate.toISOString().split('T')[0],
        relatedParty: p.borrowerName,
        type: p.type,
        amount: p.amount,
        mode: p.mode,
        status: p.status,
        ref: p.reference
    }));

    return {
        payments: data,
        pagination: buildPaginationMeta(totalRecords, page, limit)
    };
};

/**
 * GET /api/payments/reports — Revenue & analytics with aggregation pipeline.
 */
const getReports = async (lenderId) => {
    // ── Cache check (120s TTL) ───────────────────────────────
    const cacheKey = `reports:${lenderId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const mongoose = require('mongoose');
    const lenderObjId = new mongoose.Types.ObjectId(lenderId);

    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    // Revenue trend aggregation
    const revenueAgg = await Payment.aggregate([
        {
            $match: {
                lender: lenderObjId,
                status: 'Completed',
                paymentDate: { $gte: sevenMonthsAgo }
            }
        },
        {
            $group: {
                _id: { $month: '$paymentDate' },
                principalCollected: {
                    $sum: { $subtract: ['$amount', { $ifNull: ['$interestPortion', 0] }] }
                },
                interestEarned: {
                    $sum: { $ifNull: ['$interestPortion', 0] }
                }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueTrend = revenueAgg.map(item => ({
        name: monthNames[item._id - 1],
        principalCollected: item.principalCollected,
        interestEarned: item.interestEarned
    }));

    // Payment consistency aggregation
    const consistencyAgg = await Payment.aggregate([
        { $match: { lender: lenderObjId, status: 'Completed' } },
        {
            $project: {
                dayOfPayment: { $dayOfMonth: '$paymentDate' }
            }
        },
        {
            $bucket: {
                groupBy: '$dayOfPayment',
                boundaries: [1, 8, 15, 32],
                default: 'Other',
                output: { count: { $sum: 1 } }
            }
        }
    ]);

    const consistencyMap = {};
    consistencyAgg.forEach(b => { consistencyMap[b._id] = b.count; });

    const paymentConsistency = [
        { name: 'On Time', value: consistencyMap[1] || 0 },
        { name: 'Late (1-7 days)', value: consistencyMap[8] || 0 },
        { name: 'Overdue (7+ days)', value: consistencyMap[15] || 0 }
    ];

    // Recent transactions (last 10)
    const recentPayments = await Payment.find({
        lender: lenderId,
        status: 'Completed'
    })
        .select('paymentDate borrowerName type amount mode status')
        .sort({ paymentDate: -1 })
        .limit(10)
        .lean();

    const recentTransactions = recentPayments.map(p => ({
        date: p.paymentDate.toISOString().split('T')[0],
        borrower: p.borrowerName,
        type: p.type,
        amount: p.amount,
        mode: p.mode,
        status: p.status
    }));

    const result = {
        revenueTrend,
        paymentConsistency,
        recentTransactions
    };

    await setCache(cacheKey, result, 120);
    return result;
};

module.exports = {
    recordPayment,
    getPayments,
    getReports
};
