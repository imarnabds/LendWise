/**
 * Loan Controller — thin HTTP layer.
 * Extracts request data → calls service → sends response.
 * All business logic lives in loanService.js.
 */

const loanService = require('../services/loanService');

const getLoans = async (req, res, next) => {
    try {
        const result = await loanService.getLoans(req.user.id, {
            pagination: req.pagination,
            sorting: req.sorting,
            filters: req.filters
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const getDashboard = async (req, res, next) => {
    try {
        const stats = await loanService.getDashboardStats(req.user.id);
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

const getPendingPayments = async (req, res, next) => {
    try {
        const result = await loanService.getPendingPayments(req.user.id, {
            pagination: req.pagination,
            filters: req.filters
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const getBorrowerHistory = async (req, res, next) => {
    try {
        const result = await loanService.getBorrowerHistory(req.user.id, {
            pagination: req.pagination
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const createLoan = async (req, res, next) => {
    try {
        const loan = await loanService.createLoan(req.user.id, req.body);
        res.status(201).json({
            message: 'Borrower & Loan created successfully!',
            loan
        });
    } catch (error) {
        next(error);
    }
};

const getLoanById = async (req, res, next) => {
    try {
        const result = await loanService.getLoanById(req.user.id, req.params.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const updateLoan = async (req, res, next) => {
    try {
        const loan = await loanService.updateLoan(req.user.id, req.params.id, req.body);
        res.json({ message: 'Loan updated successfully.', loan });
    } catch (error) {
        next(error);
    }
};

const deleteLoan = async (req, res, next) => {
    try {
        const result = await loanService.softDeleteLoan(req.user.id, req.params.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLoans,
    getDashboard,
    getPendingPayments,
    getBorrowerHistory,
    createLoan,
    getLoanById,
    updateLoan,
    deleteLoan
};
