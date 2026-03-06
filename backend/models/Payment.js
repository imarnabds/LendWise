const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    loan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true
    },
    lender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    borrowerName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    interestPortion: {
        type: Number,
        default: 0
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
        enum: ['EMI Payment', 'Principal', 'Late Fee'],
        default: 'EMI Payment'
    }
}, {
    timestamps: true
});

// ── Indexes for scalable queries ──────────────────────────
paymentSchema.index({ lender: 1, paymentDate: -1 });            // payment history
paymentSchema.index({ loan: 1, paymentDate: -1 });              // per-loan lookups
paymentSchema.index({ lender: 1, status: 1, paymentDate: -1 }); // reports

// Auto-generate reference number before saving
paymentSchema.pre('save', function () {
    if (!this.reference) {
        const prefix = this.mode === 'UPI' ? 'UPI' : this.mode === 'Bank Transfer' ? 'NEFT' : this.mode === 'Cheque' ? 'CHQ' : 'RCPT';
        this.reference = `${prefix}/${Date.now().toString().slice(-9)}`;
    }
});

module.exports = mongoose.model('Payment', paymentSchema);
