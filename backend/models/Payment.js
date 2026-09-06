/**
 * Payment Model — Transaction Record & Audit Trail
 *
 * Historical Snapshot Policy:
 * `borrowerName` is captured at transaction time as a historical snapshot.
 * `lenderId`, `borrowerId`, and `loanId` are required relational references to User and Loan models.
 */

const mongoose = require('mongoose');
const { roundMoney } = require('../utils/money');

const paymentSchema = new mongoose.Schema({
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true
    },
    lenderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    borrowerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Historical Snapshot Field
    borrowerName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    interestPortion: {
        type: Number,
        default: 0,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    principalPortion: {
        type: Number,
        default: 0,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    paymentDate: {
        type: Date,
        required: true
    },
    mode: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'],
        default: 'Cash'
    },
    reference: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Completed', 'Processing', 'Failed'],
        default: 'Completed'
    },
    type: {
        type: String,
        enum: ['EMI Payment', 'Principal', 'Late Fee', 'Principal + Interest'],
        default: 'EMI Payment'
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// ── Indexes for scalable queries ──────────────────────────
paymentSchema.index({ lenderId: 1, paymentDate: -1 });            // payment history
paymentSchema.index({ loanId: 1, paymentDate: -1 });              // per-loan lookups
paymentSchema.index({ lenderId: 1, status: 1, paymentDate: -1 }); // reports
paymentSchema.index({ borrowerId: 1, paymentDate: -1 });          // borrower payment history

// Auto-generate reference number before saving
paymentSchema.pre('save', function () {
    if (!this.reference) {
        const prefix = this.mode === 'UPI' ? 'UPI' : this.mode === 'Bank Transfer' ? 'NEFT' : this.mode === 'Cheque' ? 'CHQ' : 'RCPT';
        this.reference = `${prefix}/${Date.now().toString().slice(-9)}`;
    }
});

module.exports = mongoose.model('Payment', paymentSchema);
