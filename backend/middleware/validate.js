/**
 * Lightweight query-parameter validation & sanitization middleware.
 * No external dependencies — uses built-in JS validation.
 *
 * Attaches sanitised values to req.pagination, req.sorting, req.filters
 * so controllers/services can use them directly.
 */

const ALLOWED_SORT_FIELDS = [
    'createdAt', 'principalAmount', 'interestRate',
    'borrowerName', 'startDate', 'durationMonths', 'status'
];

const ALLOWED_ORDERS = ['asc', 'desc'];

/**
 * Middleware: validateLoanQuery
 * Validates and normalises pagination, sorting, and filter params for loan endpoints.
 */
const validateLoanQuery = (req, res, next) => {
    const { page, limit, sortBy, order, status, search, startDate, endDate } = req.query;

    // ── Pagination ────────────────────────────────────────
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    req.pagination = {
        page: (!isNaN(parsedPage) && parsedPage > 0) ? parsedPage : 1,
        limit: (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) ? parsedLimit : 20
    };

    // ── Sorting ───────────────────────────────────────────
    req.sorting = {
        sortBy: ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt',
        order: ALLOWED_ORDERS.includes(order) ? order : 'desc'
    };

    // ── Filters ───────────────────────────────────────────
    req.filters = {};

    if (status && status !== 'All') {
        const allowed = ['Active', 'Overdue', 'Closed', 'Deleted'];
        if (allowed.includes(status)) {
            req.filters.status = status;
        }
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
        req.filters.search = search.trim();
    }

    if (startDate && !isNaN(Date.parse(startDate))) {
        req.filters.startDate = new Date(startDate);
    }
    if (endDate && !isNaN(Date.parse(endDate))) {
        req.filters.endDate = new Date(endDate);
    }

    next();
};

/**
 * Middleware: validatePaymentQuery
 * Validates pagination + optional search/filter for payment endpoints.
 */
const validatePaymentQuery = (req, res, next) => {
    const { page, limit, search, status } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    req.pagination = {
        page: (!isNaN(parsedPage) && parsedPage > 0) ? parsedPage : 1,
        limit: (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) ? parsedLimit : 20
    };

    req.filters = {};

    if (search && typeof search === 'string' && search.trim().length > 0) {
        req.filters.search = search.trim();
    }
    if (status && status !== 'All') {
        req.filters.status = status;
    }

    next();
};

module.exports = { validateLoanQuery, validatePaymentQuery };
