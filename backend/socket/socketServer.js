/**
 * Socket.IO Server Initialization & Connection Management
 *
 * Configures Socket.IO server on top of Node HTTP Server.
 * Enforces JWT authentication, manages user room subscriptions (`user:${userId}`),
 * and handles authorized loan room subscriptions (`loan:${loanId}`).
 */

const { Server } = require('socket.io');
const mongoose = require('mongoose');
const socketAuthMiddleware = require('./socketAuth');
const Loan = require('../models/Loan');
const logger = require('../utils/logger');

let io = null;

const initSocket = (httpServer) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    io = new Server(httpServer, {
        cors: {
            origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Enforce JWT Authentication on connection handshake
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        const userId = socket.user.id;
        const userRoom = `user:${userId}`;

        // Automatically join user room
        socket.join(userRoom);
        logger.info(`Socket ${socket.id} joined user room: ${userRoom}`);

        // Handle request to join a specific loan room
        socket.on('joinLoan', async (data, ack) => {
            const loanId = typeof data === 'string' ? data : data?.loanId;
            if (!loanId || !mongoose.Types.ObjectId.isValid(loanId)) {
                if (typeof ack === 'function') ack({ status: 'error', message: 'Invalid loan ID format' });
                return;
            }

            try {
                // Fetch authoritative Loan from MongoDB to perform relationship authorization
                const loan = await Loan.findById(loanId).lean();
                if (!loan) {
                    if (typeof ack === 'function') ack({ status: 'error', message: 'Loan not found' });
                    return;
                }

                const isLender = loan.lenderId.toString() === userId;
                const isBorrower = loan.borrowerId.toString() === userId;

                if (!isLender && !isBorrower) {
                    logger.warn(`Unauthorized room join attempt: User ${userId} tried to join loan room loan:${loanId}`);
                    if (typeof ack === 'function') ack({ status: 'error', message: 'Access denied. You are not a party to this loan.' });
                    return;
                }

                const loanRoom = `loan:${loanId}`;
                socket.join(loanRoom);
                logger.info(`Socket ${socket.id} (User ${userId}) joined loan room: ${loanRoom}`);
                if (typeof ack === 'function') ack({ status: 'ok', room: loanRoom });
            } catch (err) {
                logger.error(`Error in joinLoan handler: ${err.message}`);
                if (typeof ack === 'function') ack({ status: 'error', message: 'Internal server error' });
            }
        });

        socket.on('disconnect', (reason) => {
            logger.info(`Socket ${socket.id} (User ${userId}) disconnected: ${reason}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO is not initialized!');
    }
    return io;
};

const closeSocket = async () => {
    if (io) {
        await io.close();
        io = null;
    }
};

module.exports = {
    initSocket,
    getIO,
    closeSocket
};
