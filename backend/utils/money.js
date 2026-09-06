/**
 * Money Utility — Helper functions for authoritative monetary calculations and precision.
 *
 * Money Policy:
 * All monetary values are represented in standard currency units (Rupees) rounded strictly to
 * 2 decimal places (or integer paise where applicable). Floating point inaccuracies are
 * prevented by rounding every intermediate and final financial result using `roundMoney`.
 */

/**
 * Rounds a number or string to 2 decimal places cleanly.
 * @param {number|string} amount
 * @returns {number}
 */
const roundMoney = (amount) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Calculates APR Simple Interest:
 * totalInterest = principalAmount * (interestRate / 100) * (durationMonths / 12)
 */
const calculateSimpleInterest = (principalAmount, interestRate, durationMonths) => {
    const p = roundMoney(principalAmount);
    const r = parseFloat(interestRate) || 0;
    const n = parseInt(durationMonths, 10) || 0;

    if (p <= 0 || r < 0 || n <= 0) {
        return { totalInterest: 0, totalPayable: p, emi: p };
    }

    // APR Simple Interest formula: Principal * (Annual Rate / 100) * (Months / 12)
    const annualInterest = p * (r / 100);
    const totalInterest = roundMoney(annualInterest * (n / 12));
    const totalPayable = roundMoney(p + totalInterest);
    const emi = roundMoney(totalPayable / n);

    return {
        totalInterest,
        totalPayable,
        emi
    };
};

module.exports = {
    roundMoney,
    calculateSimpleInterest
};
