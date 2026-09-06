/**
 * Loan Service — all business logic for loan operations.
 *
 * Responsibilities:
 *  - Server-side filtering, sorting, pagination
 *  - Authoritative interest calculation (APR simple interest model)
 *  - Lender & Borrower role validation (No automatic account creation or role mutation)
 *  - Resource-level and Collection-level authorization (Actor vs Financial Parties)
 *  - Dashboard aggregation & pending payment computation
 *  - CRUD operations with financial immutability protections
 *  - Event notification hooks for real-time synchronization
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { validateCreateLoan, ValidationError } = require('../validators/loanValidator');
const { getCache, setCache, invalidatePattern } = require('../config/redis');
const logger = require('../utils/logger');
const { roundMoney, calculateSimpleInterest } = require('../utils/money');

// Event Emitter for Phase 5 real-time sync readiness
const loanEvents = new EventEmitter();

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Build a pagination metadata object.
 */
const buildPaginationMeta = (totalRecords, page, limit) => {
    return {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit) || 1,
        totalRecords,
        limit
    };
};

/**
 * Compute interest fields for a single loan document using APR Simple Interest.
 * All interest logic lives HERE — the frontend receives pre-computed values.
 */
const computeInterestFields = (loan, totalPaidForLoan = 0) => {
    const principal = roundMoney(loan.principalAmount || 0);
    const rate = loan.interestRate || 0;
    const duration = loan.durationMonths || 1;

    const { totalInterest, totalPayable, emi } = calculateSimpleInterest(principal, rate, duration);

    // Monthly interest portion for display
    const monthlyInterest = roundMoney(totalInterest / duration);

    // Accrued interest & pending interest calculations
    const now = new Date();
    const start = new Date(loan.startDate);
    let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (monthsElapsed < 0) monthsElapsed = 0;
    if (monthsElapsed > duration) monthsElapsed = duration;

    const accruedInterest = roundMoney(monthlyInterest * monthsElapsed);
    const pendingInterest = roundMoney(Math.max(0, accruedInterest - totalPaidForLoan));

    return {
        monthlyInterest,
        totalInterest,
        totalPayable,
        emi: loan.emi || emi,
        pendingInterest,
        amountPaid: roundMoney(loan.amountPaid || 0),
        remainingBalance: roundMoney(loan.remainingBalance !== undefined ? loan.remainingBalance : totalPayable)
    };
};

// ────────────────────────────────────────────────────────────
// Service Methods
// ────────────────────────────────────────────────────────────

/**
 * GET /api/loans
 * Collection-level authorization:
 *  - LENDER actor retrieves loans where lenderId = actor.id
 *  - BORROWER actor retrieves loans where borrowerId = actor.id
 * Soft-deleted loans (deletedAt !== null) are excluded from normal queries.
 */
const getLoans = async (actor, { pagination, sorting, filters }) => {
    const { page, limit } = pagination;
    const { sortBy, order } = sorting;
    const actorId = actor.id || actor._id;

    // Cache key
    const cacheKey = `loans:${actorId}:${actor.role}:p${page}l${limit}s${sortBy}o${order}f${JSON.stringify(filters)}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Collection-level authorization query scope + soft-delete exclusion
    const query = {
        deletedAt: null,
        ...(actor.role === 'BORROWER' ? { borrowerId: actorId } : { lenderId: actorId })
    };

    if (filters.status && filters.status !== 'All') {
        query.status = filters.status;
    }

    if (filters.search) {
        query.borrowerName = { $regex: filters.search, $options: 'i' };
    }

    if (filters.startDate || filters.endDate) {
        query.startDate = {};
        if (filters.startDate) query.startDate.$gte = filters.startDate;
        if (filters.endDate) query.startDate.$lte = filters.endDate;
    }

    const sortObj = { [sortBy]: order === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [totalRecords, loans] = await Promise.all([
        Loan.countDocuments(query),
        Loan.find(query)
            .select('lenderId borrowerId borrowerName borrowerPhone principalAmount interestRate startDate durationMonths emi dueDate status totalInterest totalPayable amountPaid remainingBalance collateral notes createdAt')
            .populate('lenderId', 'name phone email')
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    // Fetch total payments for these loans
    const loanIds = loans.map(l => l._id);
    const paymentAgg = await Payment.aggregate([
        { $match: { loanId: { $in: loanIds }, status: 'Completed' } },
        { $group: { _id: '$loanId', totalPaid: { $sum: '$amount' }, totalInterestPaid: { $sum: '$interestPortion' } } }
    ]);
    const paidMap = {};
    paymentAgg.forEach(p => { paidMap[p._id.toString()] = p.totalInterestPaid; });

    const data = loans.map(loan => {
        const totalPaid = paidMap[loan._id.toString()] || 0;
        const interestFields = computeInterestFields(loan, totalPaid);
        const lenderObj = typeof loan.lenderId === 'object' && loan.lenderId ? loan.lenderId : null;
        const lenderIdStr = lenderObj ? (lenderObj._id || lenderObj.id).toString() : (loan.lenderId ? loan.lenderId.toString() : '');

        return {
            loanId: loan._id,
            lenderId: lenderIdStr,
            lenderName: lenderObj ? lenderObj.name : 'Lender',
            lenderPhone: lenderObj ? lenderObj.phone : '',
            lenderEmail: lenderObj ? lenderObj.email : '',
            borrowerId: loan.borrowerId,
            borrowerName: loan.borrowerName,
            borrowerPhone: loan.borrowerPhone,
            principal: roundMoney(loan.principalAmount),
            interestRate: loan.interestRate,
            status: loan.status,
            startDate: loan.startDate ? loan.startDate.toISOString().split('T')[0] : '',
            durationMonths: loan.durationMonths,
            emi: interestFields.emi,
            dueDate: loan.dueDate,
            monthlyInterest: interestFields.monthlyInterest,
            totalInterest: interestFields.totalInterest,
            totalPayable: interestFields.totalPayable,
            amountPaid: interestFields.amountPaid,
            remainingBalance: interestFields.remainingBalance,
            pendingInterest: interestFields.pendingInterest,
            // Legacy compatibility fields for existing LendWise frontend
            id: loan._id,
            name: loan.borrowerName,
            amount: roundMoney(loan.principalAmount),
            interest: `${loan.interestRate}%`,
            phone: loan.borrowerPhone
        };
    });

    const result = {
        data,
        pagination: buildPaginationMeta(totalRecords, page, limit)
    };

    await setCache(cacheKey, result, 30);
    return result;
};

/**
 * GET /api/loans/dashboard
 * Aggregated statistics scoped by authenticated actor role & ID.
 */
const getDashboardStats = async (actor, timeframe = 'monthly') => {
    const actorId = actor.id || actor._id;
    const cacheKey = `dashboard:${actorId}:${actor.role}:${timeframe}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const actorObjId = new mongoose.Types.ObjectId(actorId);

    const matchScope = {
        deletedAt: null,
        ...(actor.role === 'BORROWER' ? { borrowerId: actorObjId } : { lenderId: actorObjId })
    };

    const loanStats = await Loan.aggregate([
        { $match: matchScope },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalPrincipal: { $sum: '$principalAmount' },
                totalPaid: { $sum: '$amountPaid' },
                totalRemaining: { $sum: '$remainingBalance' },
                totalMonthlyInterest: {
                    $sum: {
                        $divide: [
                            { $multiply: ['$principalAmount', { $divide: ['$interestRate', 100] }, { $divide: ['$durationMonths', 12] }] },
                            '$durationMonths'
                        ]
                    }
                }
            }
        }
    ]);

    let totalBorrowers = 0, totalAmountLent = 0, monthlyInterest = 0;
    let totalPaid = 0, totalRemaining = 0;
    let activeLoans = 0, closedLoans = 0, overdueLoans = 0;

    loanStats.forEach(stat => {
        totalAmountLent += stat.totalPrincipal;
        totalPaid += stat.totalPaid;
        totalRemaining += stat.totalRemaining;

        if (stat._id === 'Active' || stat._id === 'Overdue') {
            totalBorrowers += stat.count;
            monthlyInterest += stat.totalMonthlyInterest;
        }
        if (stat._id === 'Active') activeLoans = stat.count;
        if (stat._id === 'Closed') closedLoans = stat.count;
        if (stat._id === 'Overdue') overdueLoans = stat.count;
    });

    // Income chart aggregation
    const now = new Date();
    let startDate;
    let formatStr;

    if (timeframe === 'daily') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);
        formatStr = "%Y-%m-%d";
    } else if (timeframe === 'weekly') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 56);
        formatStr = "%Y-W%V";
    } else if (timeframe === 'yearly') {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
        formatStr = "%Y";
    } else {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 7);
        formatStr = "%Y-%m";
    }

    const paymentMatchScope = actor.role === 'BORROWER'
        ? { borrowerId: actorObjId, status: 'Completed', paymentDate: { $gte: startDate } }
        : { lenderId: actorObjId, status: 'Completed', paymentDate: { $gte: startDate } };

    const incomeAgg = await Payment.aggregate([
        { $match: paymentMatchScope },
        {
            $group: {
                _id: { $dateToString: { format: formatStr, date: '$paymentDate' } },
                income: { $sum: '$amount' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const incomeData = incomeAgg.map(item => {
        let name = item._id;

        if (timeframe === 'monthly') {
            const [year, month] = name.split('-');
            name = `${monthNames[parseInt(month) - 1]} '${year.substring(2)}`;
        } else if (timeframe === 'weekly') {
            const [year, week] = name.split('-W');
            name = `W${week} '${year.substring(2)}`;
        } else if (timeframe === 'daily') {
            const [, month, day] = name.split('-');
            name = `${parseInt(day)} ${monthNames[parseInt(month) - 1]}`;
        }

        return {
            name,
            income: roundMoney(item.income)
        };
    });

    const result = {
        totalBorrowers,
        totalAmountLent: roundMoney(totalAmountLent),
        totalPaid: roundMoney(totalPaid),
        remainingBalance: roundMoney(totalRemaining),
        activeLoans,
        monthlyInterest: roundMoney(monthlyInterest),
        pendingPayments: overdueLoans,
        overdueAccounts: overdueLoans,
        loanPortfolio: [
            { name: 'Active', value: activeLoans },
            { name: 'Closed', value: closedLoans },
            { name: 'Overdue', value: overdueLoans }
        ],
        incomeData
    };

    await setCache(cacheKey, result, 60);
    return result;
};

/**
 * GET /api/loans/pending
 */
const getPendingPayments = async (actor, { pagination, filters }) => {
    const { page, limit } = pagination;
    const actorId = actor.id || actor._id;

    const actorObjId = mongoose.Types.ObjectId.isValid(actorId)
        ? new mongoose.Types.ObjectId(actorId.toString())
        : actorId;

    const query = {
        deletedAt: null,
        status: 'Overdue',
        ...(actor.role === 'BORROWER' ? { borrowerId: actorObjId } : { lenderId: actorObjId })
    };

    const loans = await Loan.find(query)
        .sort({ status: 1, createdAt: -1 })
        .lean();

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 45);
    const paymentScope = actor.role === 'BORROWER'
        ? { borrowerId: actorObjId, status: 'Completed', paymentDate: { $gte: recentDate } }
        : { lenderId: actorObjId, status: 'Completed', paymentDate: { $gte: recentDate } };

    const recentPayments = await Payment.find(paymentScope).lean();
    const now = new Date();

    const pendingList = loans.map(loan => {
        const dueDay = parseInt(loan.dueDate);
        const lastDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        if (lastDueDate > now) {
            lastDueDate.setMonth(lastDueDate.getMonth() - 1);
        }
        const daysLate = Math.max(0, Math.floor((now - lastDueDate) / (1000 * 60 * 60 * 24)));

        const cycleStartDate = new Date(lastDueDate);
        cycleStartDate.setDate(cycleStartDate.getDate() - 20);

        let amountPaidThisCycle = 0;
        recentPayments.forEach(p => {
            const paymentTime = new Date(p.paymentDate).getTime();
            if (p.loanId.toString() === loan._id.toString() && paymentTime >= cycleStartDate.getTime()) {
                amountPaidThisCycle += p.amount;
            }
        });

        const { totalInterest, emi } = calculateSimpleInterest(loan.principalAmount, loan.interestRate, loan.durationMonths);
        const interestComponent = roundMoney(totalInterest / (loan.durationMonths || 1)) || emi;

        const safeAmountPaid = roundMoney(amountPaidThisCycle);
        const safeInterestComp = roundMoney(interestComponent);

        let severity = 'OVERDUE';

        if (loan.remainingBalance && loan.remainingBalance <= 0) {
            severity = 'PAID';
        } else if (safeAmountPaid >= safeInterestComp && safeInterestComp > 0) {
            severity = 'PAID';
        } else if (safeAmountPaid > 0 && safeAmountPaid < safeInterestComp) {
            severity = 'PARTIAL';
        }

        return {
            id: loan._id,
            name: loan.borrowerName,
            interestComponent: safeInterestComp,
            principalComponent: 0,
            amountPaid: safeAmountPaid,
            amountDue: roundMoney(Math.max(0, safeInterestComp - safeAmountPaid)),
            dueDate: lastDueDate.toISOString().split('T')[0],
            daysLate,
            contact: loan.borrowerPhone,
            status: severity
        };
    }).filter(item => {
        if (item.status === 'PAID') return false;
        if (!filters.status || filters.status === 'All') return true;
        return item.status === filters.status;
    });

    const totalRecords = pendingList.length;
    const skip = (page - 1) * limit;
    const paginatedList = pendingList.slice(skip, skip + limit);

    return {
        pendingPayments: paginatedList,
        pagination: buildPaginationMeta(totalRecords, page, limit)
    };
};

/**
 * GET /api/loans/borrower-history
 * Retrieves soft-deleted/archived loans (deletedAt !== null).
 */
const getBorrowerHistory = async (actor, { pagination }) => {
    const { page, limit } = pagination;
    const actorId = actor.id || actor._id;

    const query = { lenderId: actorId, deletedAt: { $ne: null } };

    const [totalRecords, loans] = await Promise.all([
        Loan.countDocuments(query),
        Loan.find(query)
            .select('borrowerName principalAmount interestRate durationMonths startDate deletedAt')
            .sort({ deletedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
    ]);

    const history = loans.map(loan => ({
        id: loan._id,
        name: loan.borrowerName,
        principalAmount: roundMoney(loan.principalAmount),
        interestRate: loan.interestRate,
        durationMonths: loan.durationMonths,
        startDate: loan.startDate.toISOString().split('T')[0],
        deletedAt: loan.deletedAt ? loan.deletedAt.toISOString().split('T')[0] : null
    }));

    return {
        history,
        pagination: buildPaginationMeta(totalRecords, page, limit)
    };
};

/**
 * POST /api/loans — Create a new loan.
 * Mandatory Rules:
 *  - Validate target lenderId exists and has role === 'LENDER'
 *  - Validate target borrowerId exists and has role === 'BORROWER'
 *  - If borrower does NOT exist, throw 404 Not Found error (NO implicit auto-creation)
 *  - NEVER automatically change a user's role.
 *  - Calculate totalInterest, totalPayable, amountPaid (0), remainingBalance authoritatively.
 */
const createLoan = async (actor, body) => {
    const validated = validateCreateLoan(body);
    const actorId = actor.id || actor._id;

    let targetLenderId = validated.lenderId || actorId;
    if (!mongoose.Types.ObjectId.isValid(targetLenderId)) {
        throw new ValidationError('Invalid lenderId format.');
    }

    // 1. Validate Lender
    const lenderUser = await User.findById(targetLenderId);
    if (!lenderUser) {
        const err = new Error('Lender user not found.');
        err.statusCode = 404;
        throw err;
    }
    if (lenderUser.role !== 'LENDER') {
        const err = new Error(`User specified as lender (${targetLenderId}) does not have role LENDER.`);
        err.statusCode = 400;
        throw err;
    }
    if (actor.role === 'LENDER') {
        targetLenderId = actorId;
    }

    // 2. Validate Borrower (EXPLICIT EXISTENCE CHECK — NO AUTO CREATION)
    let borrowerUser;
    if (validated.borrowerId) {
        if (!mongoose.Types.ObjectId.isValid(validated.borrowerId)) {
            throw new ValidationError('Invalid borrowerId format.');
        }
        borrowerUser = await User.findById(validated.borrowerId);
    } else {
        borrowerUser = await User.findOne({ phone: validated.borrowerPhone });
    }

    if (!borrowerUser) {
        const err = new Error('Borrower user not found. Please ensure the borrower has registered an account.');
        err.statusCode = 404;
        throw err;
    }

    if (borrowerUser.role !== 'BORROWER') {
        const err = new Error(`User specified as borrower (${borrowerUser._id}) does not have role BORROWER.`);
        err.statusCode = 400;
        throw err;
    }

    // 3. Authoritative Financial Calculations (APR Simple Interest)
    const { principalAmount: p, interestRate: r, durationMonths: n, startDate } = validated;
    const { totalInterest, totalPayable, emi } = calculateSimpleInterest(p, r, n);
    const amountPaid = 0;
    const remainingBalance = totalPayable;

    // Extract due date from start date
    const startDateObj = new Date(startDate);
    const dayNum = startDateObj.getDate();
    const dueDate = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;

    const loan = new Loan({
        lenderId: targetLenderId,
        borrowerId: borrowerUser._id,
        borrowerName: validated.borrowerName || borrowerUser.name,
        borrowerPhone: validated.borrowerPhone || borrowerUser.phone,
        borrowerAddress: validated.borrowerAddress || borrowerUser.address || '',
        principalAmount: p,
        interestRate: r,
        startDate: startDateObj,
        durationMonths: n,
        totalInterest,
        totalPayable,
        amountPaid,
        remainingBalance,
        emi,
        dueDate,
        collateral: validated.collateral,
        notes: validated.notes,
        status: 'Active',
        deletedAt: null
    });

    await loan.save();
    logger.info(`Loan created: ${loan.borrowerName} (Principal: ₹${p}, TotalPayable: ₹${totalPayable})`);

    await invalidatePattern(`loans:${lenderUser._id}:*`);
    await invalidatePattern(`loans:${borrowerUser._id}:*`);
    await invalidatePattern(`dashboard:${lenderUser._id}*`);
    await invalidatePattern(`dashboard:${borrowerUser._id}*`);

    loanEvents.emit('loan:created', loan);
    return loan;
};

/**
 * GET /api/loans/:id — Single loan with computed interest.
 * Resource-level authorization: actorId must be lenderId OR borrowerId of this loan.
 */
const getLoanById = async (actor, loanId) => {
    const loan = await Loan.findById(loanId).lean();
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    const actorId = (actor.id || actor._id).toString();
    const isLender = loan.lenderId.toString() === actorId;
    const isBorrower = loan.borrowerId.toString() === actorId;
    if (!isLender && !isBorrower) {
        const err = new Error('Access denied. You are not authorized to view this loan.');
        err.statusCode = 403;
        throw err;
    }

    const paymentAgg = await Payment.aggregate([
        { $match: { loanId: loan._id, status: 'Completed' } },
        { $group: { _id: null, totalInterestPaid: { $sum: '$interestPortion' } } }
    ]);
    const totalPaidInterest = paymentAgg.length > 0 ? paymentAgg[0].totalInterestPaid : 0;
    const interestFields = computeInterestFields(loan, totalPaidInterest);
    const lenderUser = await User.findById(loan.lenderId).select('name phone email').lean();

    return {
        loan: {
            ...loan,
            ...interestFields,
            lenderName: lenderUser?.name || 'Lender',
            lenderPhone: lenderUser?.phone || '',
            lenderEmail: lenderUser?.email || ''
        }
    };
};

/**
 * PUT /api/loans/:id — Update a loan.
 * Resource-level Write Authorization:
 *  - Only the Lender (actor.id === loan.lenderId) is allowed to update metadata/status.
 *  - Borrowers are rejected with 403 Forbidden.
 *  - Financial & identity fields are strictly immutable.
 * Status Transition Enforcement:
 *  - Status values must be one of ['Active', 'Overdue', 'Closed'].
 *  - Terminal state 'Closed' cannot be reverted back to 'Active' or 'Overdue'.
 *  - Setting status to 'Closed' requires remainingBalance === 0.
 */
const updateLoan = async (actor, loanId, body) => {
    const loan = await Loan.findById(loanId);
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    const actorId = (actor.id || actor._id).toString();
    if (actorId !== loan.lenderId.toString()) {
        const err = new Error('Access denied. Only the lender can update loan metadata.');
        err.statusCode = 403;
        throw err;
    }

    // Status transition validation
    if (body.status !== undefined) {
        const validStatuses = ['Active', 'Overdue', 'Closed'];
        if (!validStatuses.includes(body.status)) {
            const err = new Error(`Invalid status '${body.status}'. Allowed status values are: ${validStatuses.join(', ')}.`);
            err.statusCode = 400;
            throw err;
        }

        // Reverting closed loan check
        if (loan.status === 'Closed' && body.status !== 'Closed') {
            const err = new Error('Cannot change status of a closed loan unless business rules explicitly permit.');
            err.statusCode = 400;
            throw err;
        }

        // Closing loan with remaining balance check
        if (body.status === 'Closed' && loan.remainingBalance > 0) {
            const err = new Error(`Cannot set status to Closed when remaining balance (₹${loan.remainingBalance}) is greater than zero.`);
            err.statusCode = 400;
            throw err;
        }

        loan.status = body.status;
    }

    // Explicit allowlist for metadata updates
    const allowedUpdates = ['borrowerAddress', 'collateral', 'notes'];
    allowedUpdates.forEach(field => {
        if (body[field] !== undefined) {
            loan[field] = body[field];
        }
    });

    await loan.save();
    logger.info(`Loan updated: ${loan._id}`);
    await invalidatePattern(`loans:${loan.lenderId}:*`);
    await invalidatePattern(`loans:${loan.borrowerId}:*`);
    await invalidatePattern(`dashboard:${loan.lenderId}*`);
    await invalidatePattern(`dashboard:${loan.borrowerId}*`);

    loanEvents.emit('loan:updated', loan);
    return loan;
};

/**
 * DELETE /api/loans/:id — Soft-delete a loan.
 * Resource-level Write Authorization:
 *  - Only the Lender (actor.id === loan.lenderId) is allowed to soft-delete.
 *  - Borrowers are rejected with 403 Forbidden.
 * Soft Deletion Policy:
 *  - Sets deletedAt = new Date().
 *  - Preserves business status independently from soft deletion.
 *  - Preserves Loan document and Payment history in MongoDB.
 */
const softDeleteLoan = async (actor, loanId) => {
    const loan = await Loan.findById(loanId);
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    const actorId = (actor.id || actor._id).toString();
    if (actorId !== loan.lenderId.toString()) {
        const err = new Error('Access denied. Only the lender can delete a loan.');
        err.statusCode = 403;
        throw err;
    }

    loan.deletedAt = new Date();
    await loan.save();
    logger.info(`Loan soft-deleted: ${loan._id}`);
    await invalidatePattern(`loans:${loan.lenderId}:*`);
    await invalidatePattern(`loans:${loan.borrowerId}:*`);
    await invalidatePattern(`dashboard:${loan.lenderId}*`);
    await invalidatePattern(`dashboard:${loan.borrowerId}*`);

    loanEvents.emit('loan:deleted', loan);
    return { message: 'Borrower moved to history successfully.' };
};

module.exports = {
    loanEvents,
    getLoans,
    getDashboardStats,
    getPendingPayments,
    getBorrowerHistory,
    createLoan,
    getLoanById,
    updateLoan,
    softDeleteLoan,
    computeInterestFields
};
