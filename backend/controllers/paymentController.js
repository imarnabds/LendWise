/**
 * Payment Controller — thin HTTP layer.
 * Extracts request data and passes authenticated actor (req.user) to service layer.
 * All business logic & resource authorization lives in paymentService.js.
 */

const paymentService = require('../services/paymentService');

const recordPayment = async (req, res, next) => {
    try {
        const result = await paymentService.recordPayment(req.user, req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

const getPayments = async (req, res, next) => {
    try {
        const result = await paymentService.getPayments(req.user, {
            pagination: req.pagination,
            filters: req.filters
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        const result = await paymentService.getPaymentById(req.user, req.params.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

const getReports = async (req, res, next) => {
    try {
        const result = await paymentService.getReports(req.user);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    recordPayment,
    getPaymentById,
    getPayments,
    getReports
};
