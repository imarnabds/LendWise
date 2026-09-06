/**
 * Loan Model — Financial Schema & Invariants
 *
 * Financial State Source of Truth:
 * MongoDB is the authoritative source of financial state for all loan records.
 *
 * Historical Snapshot Policy:
 * `borrowerName`, `borrowerPhone`, and `borrowerAddress` are historical snapshots
 * captured at creation for offline/fast display and auditability.
 * `borrowerId` is the single authoritative relational reference to the User model.
 */

const mongoose = require('mongoose');
const { roundMoney, calculateSimpleInterest } = require('../utils/money');

const loanSchema = new mongoose.Schema({
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
    // Historical Snapshot Fields (non-authoritative for identity)
    borrowerName: {
        type: String,
        required: true,
        trim: true
    },
    borrowerPhone: {
        type: String,
        required: true,
        trim: true
    },
    borrowerAddress: {
        type: String,
        default: ''
    },
    // Authoritative Financial Fields
    principalAmount: {
        type: Number,
        required: true,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    interestRate: {
        type: Number,
        required: true // Annual Percentage Rate (APR)
    },
    durationMonths: {
        type: Number,
        required: true
    },
    totalInterest: {
        type: Number,
        required: true,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    totalPayable: {
        type: Number,
        required: true,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    amountPaid: {
        type: Number,
        default: 0,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    remainingBalance: {
        type: Number,
        required: true,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    emi: {
        type: Number,
        default: 0,
        get: v => roundMoney(v),
        set: v => roundMoney(v)
    },
    dueDate: {
        type: String,
        default: '05'
    },
    startDate: {
        type: Date,
        required: true
    },
    collateral: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Active', 'Overdue', 'Closed', 'Deleted'],
        default: 'Active'
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// ── Indexes for scalable queries ──────────────────────────
loanSchema.index({ lenderId: 1, status: 1, createdAt: -1 });   // primary lender listing
loanSchema.index({ lenderId: 1, deletedAt: -1 });               // borrower history
loanSchema.index({ lenderId: 1, borrowerName: 1 });             // search queries
loanSchema.index({ borrowerId: 1, status: 1 });                 // borrower dashboard lookups

// Synchronous pre-save invariant guard for new loans
loanSchema.pre('save', function () {
    if (this.isNew) {
        if (this.totalInterest === undefined || this.totalPayable === undefined) {
            const calculated = calculateSimpleInterest(this.principalAmount, this.interestRate, this.durationMonths);
            this.totalInterest = calculated.totalInterest;
            this.totalPayable = calculated.totalPayable;
            this.emi = calculated.emi;
        }
        if (this.amountPaid === undefined) {
            this.amountPaid = 0;
        }
        if (this.remainingBalance === undefined) {
            this.remainingBalance = roundMoney(this.totalPayable - this.amountPaid);
        }
    }
});

module.exports = mongoose.model('Loan', loanSchema);
