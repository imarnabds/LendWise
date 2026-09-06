/**
 * Socket.IO Domain Event Dispatcher
 *
 * Listens for committed domain events emitted by the financial engine (`paymentEvents`)
 * and broadcasts targeted real-time updates strictly to the two authorized parties of the loan.
 */

const { paymentEvents } = require('../services/paymentService');
const { getIO } = require('./socketServer');
const logger = require('../utils/logger');

const registerSocketEvents = () => {
    paymentEvents.on('payment:recorded', ({ payment, loan }) => {
        try {
            let io;
            try {
                io = getIO();
            } catch {
                // Socket.IO not initialized (e.g. in standalone unit tests without HTTP server)
                return;
            }

            const lenderRoom = `user:${loan.lenderId.toString()}`;
            const borrowerRoom = `user:${loan.borrowerId.toString()}`;
            const loanRoom = `loan:${loan._id.toString()}`;

            const payload = {
                type: 'payment.created',
                paymentId: payment._id.toString(),
                loanId: loan._id.toString(),
                amount: payment.amount,
                principalPortion: payment.principalPortion,
                interestPortion: payment.interestPortion,
                amountPaid: loan.amountPaid,
                remainingBalance: loan.remainingBalance,
                status: loan.status,
                paymentDate: payment.paymentDate ? payment.paymentDate.toISOString() : new Date().toISOString(),
                borrowerName: payment.borrowerName,
                mode: payment.mode,
                timestamp: new Date().toISOString()
            };

            // Emit to both authorized party rooms and the specific loan room
            io.to(lenderRoom).to(borrowerRoom).to(loanRoom).emit('payment.created', payload);

            logger.info(`Socket.IO event payment.created dispatched for Payment ${payment._id} (Loan: ${loan._id}) to rooms ${lenderRoom}, ${borrowerRoom}`);
        } catch (err) {
            logger.error(`Error broadcasting Socket.IO payment event: ${err.message}`);
        }
    });
};

module.exports = registerSocketEvents;
