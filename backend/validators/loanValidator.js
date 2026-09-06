/**
 * Request body validators for loan endpoints.
 * Uses built-in JS validation — no external libs required.
 */

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

/**
 * Validate the body for POST /api/loans (creating a new loan).
 * Throws a ValidationError if any required field is missing or invalid.
 */
const validateCreateLoan = (body) => {
    const { borrowerName, borrowerPhone, principalAmount, interestRate, startDate, durationMonths, lenderId, borrowerId } = body;

    if (!borrowerName || typeof borrowerName !== 'string' || borrowerName.trim().length === 0) {
        throw new ValidationError('Borrower name is required.');
    }
    if (!borrowerPhone || typeof borrowerPhone !== 'string' || borrowerPhone.trim().length === 0) {
        throw new ValidationError('Borrower phone is required.');
    }

    const p = parseFloat(principalAmount);
    if (isNaN(p) || p <= 0) {
        throw new ValidationError('Principal amount must be a positive number.');
    }

    const r = parseFloat(interestRate);
    if (isNaN(r) || r < 0) {
        throw new ValidationError('Interest rate must be a non-negative number.');
    }

    if (!startDate || isNaN(Date.parse(startDate))) {
        throw new ValidationError('A valid start date is required.');
    }

    const n = parseInt(durationMonths, 10);
    if (isNaN(n) || n <= 0) {
        throw new ValidationError('Duration months must be a positive integer.');
    }

    return {
        borrowerName: borrowerName.trim(),
        borrowerPhone: borrowerPhone.trim(),
        borrowerAddress: (body.borrowerAddress || '').trim(),
        principalAmount: p,
        interestRate: r,
        startDate,
        durationMonths: n,
        collateral: (body.collateral || '').trim(),
        notes: (body.notes || '').trim(),
        lenderId: lenderId ? String(lenderId).trim() : undefined,
        borrowerId: borrowerId ? String(borrowerId).trim() : undefined
    };
};

module.exports = { validateCreateLoan, ValidationError };
