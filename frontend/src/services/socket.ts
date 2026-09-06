/**
 * Centralized Socket.IO Client Service
 *
 * Manages real-time connection lifecycle, authentication, event subscriptions,
 * and automatic cleanup for the LendWise frontend application.
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export interface PaymentCreatedEventPayload {
    type: string;
    paymentId: string;
    loanId: string;
    amount: number;
    principalPortion?: number;
    interestPortion?: number;
    amountPaid: number;
    remainingBalance: number;
    status: string;
    paymentDate: string;
    borrowerName?: string;
    mode?: string;
    timestamp: string;
}

/**
 * Connect to Socket.IO server with JWT authentication.
 */
export const connectSocket = (token: string): Socket => {
    if (socket && socket.connected) {
        return socket;
    }

    if (socket) {
        socket.disconnect();
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('⚡ Connected to LendWise Real-Time Socket:', socket?.id);
    });

    socket.on('connect_error', (error) => {
        console.warn('⚠️ Socket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
    });

    return socket;
};

/**
 * Disconnect current socket session.
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Get active socket instance.
 */
export const getSocket = (): Socket | null => socket;

/**
 * Subscribe to real-time `payment.created` events.
 * Returns an unsubscribe cleanup function for React useEffect.
 */
export const onPaymentCreated = (callback: (data: PaymentCreatedEventPayload) => void): (() => void) => {
    if (!socket) return () => {};

    socket.on('payment.created', callback);

    return () => {
        if (socket) {
            socket.off('payment.created', callback);
        }
    };
};
