/**
 * Payment Controller — thin HTTP layer.
 * Extracts request data → calls service → sends response.
 * All business logic lives in paymentService.js.
 */

const paymentService = require('../services/paymentService');

const recordPayment = async (req, res, next) => {
    try {
        const result = await paymentService.recordPayment(req.user.id, req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

const getPayments = async (req, res, next) => {
    try {
        const result = await paymentService.getPayments(req.user.id, {
            pagination: req.pagination,
            filters: req.filters
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const getReports = async (req, res, next) => {
    try {
        const result = await paymentService.getReports(req.user.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    recordPayment,
    getPayments,
    getReports
};
