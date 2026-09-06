const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

/**
 * Process authenticated user AI chat queries.
 * Queries authoritative MongoDB database scoped strictly to req.user.id and req.user.role.
 */
const processChatQuery = async ({ userId, role, message }) => {
    if (!message || typeof message !== 'string' || !message.trim()) {
        const err = new Error('Message text is required.');
        err.statusCode = 400;
        throw err;
    }

    if (message.length > 4000) {
        const err = new Error('Message exceeds maximum limit of 4000 characters.');
        err.statusCode = 400;
        throw err;
    }

    const normalizedRole = (role || '').toUpperCase();
    const queryMessage = message.trim().toLowerCase();

    // IDOR / Security check: Ignore prompt injection attempts trying to access other users or internal secrets
    const suspiciousKeywords = ['ignore previous', 'system prompt', 'all users', 'jwt', 'secret', 'password', 'database credentials', 'other user'];
    if (suspiciousKeywords.some(kw => queryMessage.includes(kw))) {
        logger.warn(`SECURITY: AI prompt injection attempt detected from User ${userId}`);
        return {
            reply: "I am LendWise AI. I can only assist you with your own authorized financial account details and platform guidance.",
            intent: "security_guardrail"
        };
    }

    // Retrieve user-scoped authoritative loans & payments from MongoDB
    const loanFilter = normalizedRole === 'LENDER'
        ? { lenderId: userId, deletedAt: null }
        : { borrowerId: userId, deletedAt: null };

    const paymentFilter = normalizedRole === 'LENDER'
        ? { lenderId: userId }
        : { borrowerId: userId };

    const [loans, payments] = await Promise.all([
        Loan.find(loanFilter).sort({ createdAt: -1 }),
        Payment.find(paymentFilter).sort({ paymentDate: -1 }).limit(5)
    ]);

    // Compute authoritative aggregates
    const activeLoans = loans.filter(l => l.status === 'Active');
    const overdueLoans = loans.filter(l => l.status === 'Overdue');
    const closedLoans = loans.filter(l => l.status === 'Closed');

    const totalPrincipal = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    const totalPayable = loans.reduce((sum, l) => sum + (l.totalPayable || 0), 0);
    const totalPaid = loans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
    const totalRemaining = loans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

    // Intent Recognition & Response Construction
    let reply = '';
    let intent = 'general';

    // 1. Balance & Portfolio inquiries
    if (
        queryMessage.includes('balance') ||
        queryMessage.includes('owe') ||
        queryMessage.includes('lent') ||
        queryMessage.includes('borrowed') ||
        queryMessage.includes('portfolio') ||
        queryMessage.includes('total')
    ) {
        intent = 'account_balance';
        if (normalizedRole === 'LENDER') {
            reply = `📊 **Your Lending Portfolio Summary:**\n` +
                `• Total Principal Funded: ₹${totalPrincipal.toLocaleString()}\n` +
                `• Total Repayments Received: ₹${totalPaid.toLocaleString()}\n` +
                `• Outstanding Balance to Collect: ₹${totalRemaining.toLocaleString()}\n` +
                `• Active Loans: ${activeLoans.length} | Overdue: ${overdueLoans.length} | Closed: ${closedLoans.length}`;
        } else {
            reply = `💳 **Your Borrowing Summary:**\n` +
                `• Total Amount Borrowed: ₹${totalPrincipal.toLocaleString()}\n` +
                `• Total Repaid: ₹${totalPaid.toLocaleString()}\n` +
                `• Current Outstanding Balance: ₹${totalRemaining.toLocaleString()}\n` +
                `• Active Loans: ${activeLoans.length} | Overdue: ${overdueLoans.length}`;
        }
    }
    // 2. EMI inquiries
    else if (queryMessage.includes('emi') || queryMessage.includes('installment') || queryMessage.includes('calculate')) {
        intent = 'emi_inquiry';
        if (loans.length > 0) {
            const activeEmiList = activeLoans.map(l => `• Loan to ${l.borrowerName}: ₹${(l.emi || 0).toLocaleString()}/month (Remaining: ₹${(l.remainingBalance || 0).toLocaleString()})`).join('\n');
            reply = `📅 **Your Current Loan EMIs:**\n${activeEmiList || 'No active EMIs at the moment.'}\n\n*Note: EMIs are computed authoritatively by LendWise based on agreed principal and duration.*`;
        } else {
            reply = `💡 You currently have no active loans. For a loan of ₹50,000 at 12% APR over 12 months, estimated monthly EMI is ₹4,442.`;
        }
    }
    // 3. Overdue & Status inquiries
    else if (queryMessage.includes('overdue') || queryMessage.includes('due') || queryMessage.includes('late')) {
        intent = 'overdue_status';
        if (overdueLoans.length > 0) {
            const overdueDetails = overdueLoans.map(l => `• ${l.borrowerName}: ₹${(l.remainingBalance || 0).toLocaleString()} remaining (Due date: Day ${l.dueDate || '05'} of month)`).join('\n');
            reply = `⚠️ **Overdue Loans Warning (${overdueLoans.length}):**\n${overdueDetails}\n\nPlease reach out or schedule payment recording immediately.`;
        } else {
            reply = `✅ Great news! All your loans are up to date with zero overdue items.`;
        }
    }
    // 4. Payment / Recent transaction inquiries
    else if (queryMessage.includes('payment') || queryMessage.includes('transaction') || queryMessage.includes('paid') || queryMessage.includes('recent') || queryMessage.includes('pay')) {
        if (queryMessage.includes('how') || queryMessage.includes('make') || queryMessage.includes('record') || queryMessage.includes('process')) {
            intent = 'payment_instructions';
            if (normalizedRole === 'LENDER') {
                reply = `💵 **How to Record a Payment (Lender):**\n` +
                    `1. Go to your **Lender Dashboard** or **Loans** page.\n` +
                    `2. Click **Record Payment** next to the active loan.\n` +
                    `3. Enter the payment amount, interest portion, and payment date.\n` +
                    `4. Click **Confirm Payment**. The borrower's balance and payment history will update instantly in real-time!`;
            } else {
                reply = `💳 **How to Make a Payment (Borrower):**\n` +
                    `1. Review your payment schedule on your **My Loans** or **Upcoming Dues** page.\n` +
                    `2. Submit your payment to your lender via your agreed payment method (Bank Transfer, Cash, or UPI).\n` +
                    `3. Once your lender records the payment, your remaining balance and payment receipt update automatically on your dashboard!`;
            }
        } else {
            intent = 'recent_payments';
            if (payments.length > 0) {
                const history = payments.map(p => `• ₹${p.amount.toLocaleString()} via ${p.mode || 'Transfer'} on ${new Date(p.paymentDate).toLocaleDateString()}`).join('\n');
                reply = `💸 **Recent Payment History:**\n${history}`;
            } else {
                reply = `ℹ️ No payment transactions recorded yet. Payments recorded on active loans will appear here instantly.`;
            }
        }
    }

    // 5. Security & Eligibility & Platform FAQs
    else if (queryMessage.includes('secure') || queryMessage.includes('data') || queryMessage.includes('eligibility') || queryMessage.includes('compare') || queryMessage.includes('work')) {
        intent = 'platform_faq';
        if (queryMessage.includes('secure') || queryMessage.includes('data')) {
            reply = `🔒 **LendWise Security Guarantee:**\n` +
                `• All financial records are protected with 256-bit encryption & JWT authorization.\n` +
                `• Your loans and payments are strictly isolated to authorized relationships.\n` +
                `• Real-time updates occur via secure Socket.IO connection.`;
        } else {
            reply = `🤝 **How LendWise Works:**\n` +
                `• **Lenders** manage peer lending portfolios, track repayments, and export financial statements.\n` +
                `• **Borrowers** view borrowing balances, due dates, and track repayment progress in real-time.\n` +
                `• Everything is synchronized live without manual page refreshes.`;
        }
    }
    // 6. Default Fallback
    else {
        intent = 'general_assistance';
        const roleTerm = normalizedRole === 'LENDER' ? 'lending portfolio' : 'borrowing relationships';
        reply = `🤖 Hello! I'm **LendWise AI**, your personal financial assistant.\n\n` +
            `You have **${loans.length} total loan(s)** in your ${roleTerm} with an outstanding balance of **₹${totalRemaining.toLocaleString()}**.\n\n` +
            `You can ask me questions like:\n` +
            `• *"How much is my remaining balance?"*\n` +
            `• *"Which loans are overdue?"*\n` +
            `• *"Show my recent payments"* or *"What is my EMI?"*`;
    }

    logger.info(`AI_QUERY_SUCCESS: User ${userId} (${normalizedRole}) intent: ${intent}`);

    return {
        reply,
        intent,
        summary: {
            totalLoans: loans.length,
            activeLoans: activeLoans.length,
            overdueLoans: overdueLoans.length,
            remainingBalance: totalRemaining
        }
    };
};

module.exports = {
    processChatQuery
};
