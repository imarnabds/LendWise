/**
 * Loan Service — all business logic for loan operations.
 *
 * Responsibilities:
 *  - Server-side filtering, sorting, pagination
 *  - Interest calculation (monthly, total payable, pending interest)
 *  - Dashboard aggregation
 *  - Pending payment computation
 *  - CRUD operations with validation
 */

const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const { validateCreateLoan, ValidationError } = require('../validators/loanValidator');
const { getCache, setCache, invalidatePattern } = require('../config/redis');
const logger = require('../utils/logger');

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
 * Compute interest fields for a single loan document.
 * All interest logic lives HERE — the frontend receives pre-computed values.
 *
 * Business rules (flat interest model used in this project):
 *   monthlyInterest  = principal × (annualRate / 100)
 *   totalPayable     = principal + (monthlyInterest × durationMonths)
 *   pendingInterest  = (accrued interest months × monthlyInterest) − total interest payments
 */
const computeInterestFields = (loan, totalPaidForLoan = 0) => {
    const principal = loan.principalAmount || 0;
    const rate = loan.interestRate || 0;
    const duration = loan.durationMonths || 1;

    // Flat monthly interest (matches the existing project convention)
    const monthlyInterest = parseFloat((principal * (rate / 100)).toFixed(2));

    // Total payable over the entire loan duration
    const totalPayable = parseFloat((principal + monthlyInterest * duration).toFixed(2));

    // How many months have elapsed since the loan started?
    const now = new Date();
    const start = new Date(loan.startDate);
    let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (monthsElapsed < 0) monthsElapsed = 0;
    if (monthsElapsed > duration) monthsElapsed = duration;

    // Total interest accrued so far
    const accruedInterest = parseFloat((monthlyInterest * monthsElapsed).toFixed(2));

    // Pending interest = accrued − paid
    const pendingInterest = parseFloat(Math.max(0, accruedInterest - totalPaidForLoan).toFixed(2));

    return { monthlyInterest, totalPayable, pendingInterest };
};

// ────────────────────────────────────────────────────────────
// Service Methods
// ────────────────────────────────────────────────────────────

/**
 * GET /api/loans
 * Paginated, filtered, sorted loan listing with computed interest fields.
 */
const getLoans = async (lenderId, { pagination, sorting, filters }) => {
    const { page, limit } = pagination;
    const { sortBy, order } = sorting;

    // ── Cache check (30s TTL) ────────────────────────────────
    const cacheKey = `loans:${lenderId}:p${page}l${limit}s${sortBy}o${order}f${JSON.stringify(filters)}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // ── Build query filter ─────────────────────────────────
    const query = { lender: lenderId };

    if (filters.status) {
        query.status = filters.status;
    } else {
        // Default: exclude soft-deleted loans
        query.status = { $ne: 'Deleted' };
    }

    if (filters.search) {
        query.borrowerName = { $regex: filters.search, $options: 'i' };
    }

    if (filters.startDate || filters.endDate) {
        query.startDate = {};
        if (filters.startDate) query.startDate.$gte = filters.startDate;
        if (filters.endDate) query.startDate.$lte = filters.endDate;
    }

    // ── Count + Fetch in parallel ──────────────────────────
    const sortObj = { [sortBy]: order === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [totalRecords, loans] = await Promise.all([
        Loan.countDocuments(query),
        Loan.find(query)
            .select('borrowerName borrowerPhone principalAmount interestRate startDate durationMonths emi dueDate status remainingBalance collateral notes createdAt')
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    // ── Fetch total interest-portion payments for these loans ──
    const loanIds = loans.map(l => l._id);
    const paymentAgg = await Payment.aggregate([
        { $match: { loan: { $in: loanIds }, status: 'Completed' } },
        { $group: { _id: '$loan', totalPaid: { $sum: '$interestPortion' } } }
    ]);
    const paidMap = {};
    paymentAgg.forEach(p => { paidMap[p._id.toString()] = p.totalPaid; });

    // ── Format response ────────────────────────────────────
    const data = loans.map(loan => {
        const totalPaid = paidMap[loan._id.toString()] || 0;
        const { monthlyInterest, totalPayable, pendingInterest } = computeInterestFields(loan, totalPaid);

        return {
            loanId: loan._id,
            borrowerName: loan.borrowerName,
            borrowerPhone: loan.borrowerPhone,
            principal: loan.principalAmount,
            interestRate: loan.interestRate,
            status: loan.status,
            startDate: loan.startDate.toISOString().split('T')[0],
            durationMonths: loan.durationMonths,
            emi: loan.emi,
            dueDate: loan.dueDate,
            monthlyInterest,
            totalPayable,
            pendingInterest,
            remainingBalance: loan.remainingBalance,
            // Legacy compat fields for existing frontend
            id: loan._id,
            name: loan.borrowerName,
            amount: loan.principalAmount,
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
 * Aggregated statistics for the Lender Dashboard.
 * Uses MongoDB aggregation for efficiency.
 */
const getDashboardStats = async (lenderId) => {
    // ── Cache check (60s TTL) ────────────────────────────────
    const cacheKey = `dashboard:${lenderId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const mongoose = require('mongoose');
    const lenderObjId = new mongoose.Types.ObjectId(lenderId);

    // ── Loan stats via aggregation ─────────────────────────
    const loanStats = await Loan.aggregate([
        { $match: { lender: lenderObjId, status: { $ne: 'Deleted' } } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalPrincipal: { $sum: '$principalAmount' },
                totalMonthlyInterest: {
                    $sum: { $multiply: ['$principalAmount', { $divide: ['$interestRate', 100] }] }
                }
            }
        }
    ]);

    let totalBorrowers = 0, totalAmountLent = 0, monthlyInterest = 0;
    let activeLoans = 0, closedLoans = 0, overdueLoans = 0;

    loanStats.forEach(stat => {
        if (stat._id === 'Active' || stat._id === 'Overdue') {
            totalBorrowers += stat.count;
            totalAmountLent += stat.totalPrincipal;
            monthlyInterest += stat.totalMonthlyInterest;
        }
        if (stat._id === 'Active') activeLoans = stat.count;
        if (stat._id === 'Closed') closedLoans = stat.count;
        if (stat._id === 'Overdue') overdueLoans = stat.count;
    });

    // ── Monthly income chart (last 7 months) ───────────────
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    const incomeAgg = await Payment.aggregate([
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
                income: { $sum: '$amount' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const incomeData = incomeAgg.map(item => ({
        name: monthNames[item._id - 1],
        income: item.income
    }));

    const result = {
        totalBorrowers,
        totalAmountLent,
        monthlyInterest: parseFloat(monthlyInterest.toFixed(2)),
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
 * Pending/overdue payments with server-side computation and pagination.
 */
const getPendingPayments = async (lenderId, { pagination, filters }) => {
    const { page, limit } = pagination;

    const query = { lender: lenderId, status: { $in: ['Active', 'Overdue'] } };

    // Count first for pagination metadata
    const totalActive = await Loan.countDocuments(query);
    const loans = await Loan.find(query)
        .sort({ status: 1, createdAt: -1 })
        .lean();

    // Fetch recent completed payments (last 45 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 45);
    const recentPayments = await Payment.find({
        lender: lenderId,
        status: 'Completed',
        paymentDate: { $gte: recentDate }
    }).lean();

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
            if (p.loan.toString() === loan._id.toString() && paymentTime >= cycleStartDate.getTime()) {
                amountPaidThisCycle += p.amount;
            }
        });

        let interestComponent = (loan.principalAmount * loan.interestRate / 100);
        if (!interestComponent || isNaN(interestComponent)) {
            interestComponent = loan.emi || 0;
        }
        const principalComponent = 0;

        const safeAmountPaid = parseFloat(amountPaidThisCycle.toFixed(2));
        const safeInterestComp = parseFloat(interestComponent.toFixed(2));

        let severity = 'PENDING';
        if (safeAmountPaid >= safeInterestComp) {
            severity = 'PAID';
        } else if (safeAmountPaid > 0 && safeAmountPaid < safeInterestComp) {
            severity = 'PARTIAL';
        } else if (lastDueDate.getTime() < now.getTime() && safeAmountPaid < safeInterestComp) {
            severity = 'OVERDUE';
        }

        return {
            id: loan._id,
            name: loan.borrowerName,
            interestComponent: safeInterestComp,
            principalComponent: parseFloat(principalComponent.toFixed(2)),
            amountPaid: safeAmountPaid,
            amountDue: parseFloat(Math.max(0, safeInterestComp - safeAmountPaid).toFixed(2)),
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

    // Server-side pagination on the computed list
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
 * Last N soft-deleted borrowers with pagination.
 */
const getBorrowerHistory = async (lenderId, { pagination }) => {
    const { page, limit } = pagination;

    const query = { lender: lenderId, status: 'Deleted' };

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
        principalAmount: loan.principalAmount,
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
 */
const createLoan = async (lenderId, body) => {
    const validated = validateCreateLoan(body);

    const { principalAmount: p, interestRate: r, durationMonths: n, startDate } = validated;

    // Calculate EMI (flat interest model)
    let emi = 0;
    if (r === 0) {
        emi = p / n;
    } else {
        const totalInterest = p * (r / 100) * n;
        emi = (p + totalInterest) / n;
    }

    // Extract due date from start date
    const startDateObj = new Date(startDate);
    const dayNum = startDateObj.getDate();
    const dueDate = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;

    const loan = new Loan({
        lender: lenderId,
        ...validated,
        emi: parseFloat(emi.toFixed(2)),
        dueDate,
        status: 'Active'
    });

    await loan.save();
    logger.info(`Loan created: ${loan.borrowerName} (₹${loan.principalAmount})`);
    await invalidatePattern(`loans:${lenderId}:*`);
    await invalidatePattern(`dashboard:${lenderId}`);
    return loan;
};

/**
 * GET /api/loans/:id — Single loan with computed interest.
 */
const getLoanById = async (lenderId, loanId) => {
    const loan = await Loan.findOne({ _id: loanId, lender: lenderId }).lean();
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    // Get total interest paid for this loan
    const paymentAgg = await Payment.aggregate([
        { $match: { loan: loan._id, status: 'Completed' } },
        { $group: { _id: null, totalPaid: { $sum: '$interestPortion' } } }
    ]);
    const totalPaid = paymentAgg.length > 0 ? paymentAgg[0].totalPaid : 0;
    const interestFields = computeInterestFields(loan, totalPaid);

    return { loan: { ...loan, ...interestFields } };
};

/**
 * PUT /api/loans/:id — Update a loan.
 */
const updateLoan = async (lenderId, loanId, body) => {
    const loan = await Loan.findOne({ _id: loanId, lender: lenderId });
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    const allowedUpdates = ['borrowerName', 'borrowerPhone', 'borrowerAddress', 'status', 'collateral', 'notes'];
    allowedUpdates.forEach(field => {
        if (body[field] !== undefined) {
            loan[field] = body[field];
        }
    });

    await loan.save();
    logger.info(`Loan updated: ${loan._id}`);
    await invalidatePattern(`loans:${lenderId}:*`);
    await invalidatePattern(`dashboard:${lenderId}`);
    return loan;
};

/**
 * DELETE /api/loans/:id — Soft-delete a loan.
 */
const softDeleteLoan = async (lenderId, loanId) => {
    const loan = await Loan.findOne({ _id: loanId, lender: lenderId });
    if (!loan) {
        const err = new Error('Loan not found.');
        err.statusCode = 404;
        throw err;
    }

    loan.status = 'Deleted';
    loan.deletedAt = new Date();
    await loan.save();
    logger.info(`Loan soft-deleted: ${loan._id}`);
    await invalidatePattern(`loans:${lenderId}:*`);
    await invalidatePattern(`dashboard:${lenderId}`);
    return { message: 'Borrower moved to history successfully.' };
};

module.exports = {
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
