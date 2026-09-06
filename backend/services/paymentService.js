/**
 * Payment Service — all business logic for payment operations.
 *
 * Responsibilities:
 *  - Atomic payment recording with zero double-spend or overpayment risks
 *  - Authoritative Loan relationship validation ({ _id, lenderId, borrowerId, remainingBalance >= amount })
 *  - Actor authorization (actor must be lenderId OR borrowerId of authoritative Loan)
 *  - Financial invariant enforcement (remainingBalance = totalPayable - amountPaid)
 *  - Paginated, filterable payment history
 *  - Revenue / analytics reports (aggregation pipeline)
 *  - Event notification hooks for real-time synchronization
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Loan = require('../models/Loan');
const User = require('../models/User');
const redisConfig = require('../config/redis');
const logger = require('../utils/logger');
const { roundMoney } = require('../utils/money');

// Event Emitter for Phase 5 real-time sync readiness
const paymentEvents = new EventEmitter();

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
 * POST /api/payments — Record a payment atomically.
 *
 * Authorization & Safety Rules:
 *  - Target Loan document is retrieved first.
 *  - actor (req.user) must be either the lender OR the borrower of that specific Loan.
 *  - Soft-deleted loans (deletedAt !== null) and closed loans (remainingBalance === 0) reject payments.
 *  - Principal and interest portions must sum to total payment amount.
 *  - Atomic MongoDB query enforces complete relationship match & remainingBalance >= parsedAmount.
 *  - Session transaction utilized where supported by MongoDB deployment.
 *  - Prevents race conditions, cross-user mismatch, and overpayment.
 */
const recordPayment = async (actor, body) => {
    const { loanId, amount, interestPortion, principalPortion, paymentDate, mode } = body;

    if (!loanId || amount === undefined || amount === null || !paymentDate) {
        const err = new Error('Loan ID, amount, and payment date are required.');
        err.statusCode = 400;
        throw err;
    }

    const parsedAmount = roundMoney(amount);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
        const err = new Error('Payment amount must be greater than zero.');
        err.statusCode = 400;
        throw err;
    }

    // 1. Fetch authoritative Loan to verify existence and financial relationship parties
    const loan = await Loan.findById(loanId);
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    // 1b. Reject payment attempts on soft-deleted/archived loans
    if (loan.deletedAt !== null) {
        const err = new Error('Payment rejected: Cannot process payment on a soft-deleted or archived loan.');
        err.statusCode = 400;
        throw err;
    }

    // 1c. Reject payment attempts on fully paid and closed loans
    if (loan.remainingBalance <= 0 || loan.status === 'Closed') {
        const err = new Error('Payment rejected: Loan is already fully paid and closed.');
        err.statusCode = 400;
        throw err;
    }

    // 2. Authorization check: Actor must be either Lender or Borrower of this loan
    const actorStr = (actor.id || actor._id).toString();
    const isLender = actorStr === loan.lenderId.toString();
    const isBorrower = actorStr === loan.borrowerId.toString();

    if (!isLender && !isBorrower) {
        const err = new Error('Access denied. You are not a party to this loan.');
        err.statusCode = 403;
        throw err;
    }

    // Allocation validation: principalPortion + interestPortion must equal total payment amount
    let parsedPrincipalPortion = roundMoney(principalPortion || 0);
    let parsedInterestPortion = roundMoney(interestPortion || 0);

    if (principalPortion !== undefined && interestPortion !== undefined) {
        if (roundMoney(parsedPrincipalPortion + parsedInterestPortion) !== parsedAmount) {
            const err = new Error(`Principal portion (₹${parsedPrincipalPortion}) and interest portion (₹${parsedInterestPortion}) must sum to total payment amount (₹${parsedAmount}).`);
            err.statusCode = 400;
            throw err;
        }
    } else if (principalPortion !== undefined && interestPortion === undefined) {
        parsedInterestPortion = roundMoney(Math.max(0, parsedAmount - parsedPrincipalPortion));
    } else if (interestPortion !== undefined && principalPortion === undefined) {
        parsedPrincipalPortion = roundMoney(Math.max(0, parsedAmount - parsedInterestPortion));
    }

    // Session transaction handling (utilized where supported by replica sets, safe fallback on standalone)
    let session = null;
    try {
        const client = mongoose.connection.client;
        const isReplicaSet = client && client.topology && typeof client.topology.hasReplicaSet === 'function' && client.topology.hasReplicaSet();
        if (isReplicaSet) {
            session = await mongoose.startSession();
            session.startTransaction();
        }
    } catch (e) {
        session = null;
    }

    try {
        // 3. Atomic Query & Update: Validate complete relationship & remaining balance
        const atomicQuery = {
            _id: loan._id,
            lenderId: loan.lenderId,
            borrowerId: loan.borrowerId,
            deletedAt: null,
            remainingBalance: { $gte: parsedAmount }
        };

        const findOpts = { returnDocument: 'after' };
        if (session) findOpts.session = session;

        const updatedLoan = await Loan.findOneAndUpdate(
            atomicQuery,
            {
                $inc: {
                    amountPaid: parsedAmount,
                    remainingBalance: -parsedAmount
                }
            },
            findOpts
        );

        if (!updatedLoan) {
            const err = new Error(`Payment rejected: Payment amount (₹${parsedAmount}) exceeds remaining loan balance or loan relationship mismatch.`);
            err.statusCode = 400;
            throw err;
        }

        // Round updated numeric fields
        updatedLoan.amountPaid = roundMoney(updatedLoan.amountPaid);
        updatedLoan.remainingBalance = roundMoney(updatedLoan.remainingBalance);

        // 4. Update loan status atomically based on remaining balance
        if (updatedLoan.remainingBalance <= 0) {
            updatedLoan.remainingBalance = 0;
            updatedLoan.status = 'Closed';
        } else if (updatedLoan.status === 'Overdue') {
            updatedLoan.status = 'Active';
        }

        const saveOpts = session ? { session } : undefined;
        await updatedLoan.save(saveOpts);

        // 5. Create Payment record
        const payment = new Payment({
            loanId: loan._id,
            lenderId: loan.lenderId,
            borrowerId: loan.borrowerId,
            borrowerName: loan.borrowerName,
            amount: parsedAmount,
            interestPortion: parsedInterestPortion,
            principalPortion: parsedPrincipalPortion,
            paymentDate: new Date(paymentDate),
            mode: mode || 'Cash',
            status: 'Completed',
            type: parsedPrincipalPortion > 0 ? 'Principal + Interest' : 'EMI Payment'
        });

        await payment.save(saveOpts);

        if (session) {
            await session.commitTransaction();
        }

        logger.info(`Payment recorded: ₹${parsedAmount} for ${loan.borrowerName} (Loan: ${loan._id})`);

        // Invalidate caches for BOTH parties (lender and borrower)
        await redisConfig.invalidatePattern(`loans:${loan.lenderId}:*`);
        await redisConfig.invalidatePattern(`loans:${loan.borrowerId}:*`);
        await redisConfig.invalidatePattern(`dashboard:${loan.lenderId}*`);
        await redisConfig.invalidatePattern(`dashboard:${loan.borrowerId}*`);
        await redisConfig.invalidatePattern(`reports:${loan.lenderId}*`);
        await redisConfig.invalidatePattern(`reports:${loan.borrowerId}*`);

        paymentEvents.emit('payment:recorded', { payment, loan: updatedLoan });

        return {
            message: `Payment of ₹${parsedAmount} recorded successfully for ${loan.borrowerName}`,
            payment,
            updatedBalance: updatedLoan.remainingBalance,
            loanStatus: updatedLoan.status
        };
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

/**
 * GET /api/payments/:id — Retrieve single payment detail with Loan relationship authorization.
 */
const getPaymentById = async (actor, paymentId) => {
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        const err = new Error('Invalid payment ID format.');
        err.statusCode = 400;
        throw err;
    }

    const payment = await Payment.findById(paymentId).lean();
    if (!payment) {
        const err = new Error('Payment not found.');
        err.statusCode = 404;
        throw err;
    }

    const loan = await Loan.findById(payment.loanId).lean();
    if (!loan) {
        const err = new Error('Associated loan not found.');
        err.statusCode = 404;
        throw err;
    }

    const actorId = (actor.id || actor._id).toString();
    const isLender = loan.lenderId.toString() === actorId;
    const isBorrower = loan.borrowerId.toString() === actorId;

    if (!isLender && !isBorrower) {
        const err = new Error('Access denied. You are not a party to the loan associated with this payment.');
        err.statusCode = 403;
        throw err;
    }

    return { payment };
};

/**
 * GET /api/payments — Paginated, filtered payment history.
 */
const getPayments = async (actor, { pagination, filters }) => {
    const { page, limit } = pagination;
    const actorId = actor.id || actor._id;

    // Search payments where actor is lenderId OR borrowerId
    const query = {
        $or: [
            { lenderId: actorId },
            { borrowerId: actorId }
        ]
    };

    if (filters.search) {
        query.borrowerName = { $regex: filters.search, $options: 'i' };
    }
    if (filters.status) {
        query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const [totalRecords, payments] = await Promise.all([
        Payment.countDocuments(query),
        Payment.find(query)
            .select('reference paymentDate borrowerName type amount mode status lenderId borrowerId loanId')
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
        amount: roundMoney(p.amount),
        mode: p.mode,
        status: p.status,
        ref: p.reference,
        loanId: p.loanId,
        paymentId: p._id
    }));

    return {
        payments: data,
        pagination: buildPaginationMeta(totalRecords, page, limit)
    };
};

/**
 * GET /api/payments/reports — Revenue & analytics with aggregation pipeline.
 */
const getReports = async (actor) => {
    const actorId = actor.id || actor._id;
    const cacheKey = `reports:${actorId}`;
    const cached = await redisConfig.getCache(cacheKey);
    if (cached) return cached;

    const actorObjId = new mongoose.Types.ObjectId(actorId);
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    // Revenue trend aggregation
    const revenueAgg = await Payment.aggregate([
        {
            $match: {
                lenderId: actorObjId,
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
        principalCollected: roundMoney(item.principalCollected),
        interestEarned: roundMoney(item.interestEarned)
    }));

    // Payment consistency aggregation
    const consistencyAgg = await Payment.aggregate([
        { $match: { lenderId: actorObjId, status: 'Completed' } },
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
        lenderId: actorId,
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
        amount: roundMoney(p.amount),
        mode: p.mode,
        status: p.status
    }));

    const result = {
        revenueTrend,
        paymentConsistency,
        recentTransactions
    };

    await redisConfig.setCache(cacheKey, result, 120);
    return result;
};

module.exports = {
    paymentEvents,
    recordPayment,
    getPaymentById,
    getPayments,
    getReports
};
