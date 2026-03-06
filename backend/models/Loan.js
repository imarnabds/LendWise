const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    lender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
    principalAmount: {
        type: Number,
        required: true
    },
    interestRate: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    durationMonths: {
        type: Number,
        required: true
    },
    emi: {
        type: Number,
        default: 0
    },
    dueDate: {
        type: String,
        default: '05'
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
    remainingBalance: {
        type: Number,
        default: 0
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// ── Indexes for scalable queries ──────────────────────────
loanSchema.index({ lender: 1, status: 1, createdAt: -1 });   // primary listing
loanSchema.index({ lender: 1, deletedAt: -1 });               // borrower history
loanSchema.index({ lender: 1, borrowerName: 1 });             // search queries

// Before saving, calculate remaining balance if not set
loanSchema.pre('save', function () {
    if (this.isNew && this.remainingBalance === 0) {
        const totalInterest = this.principalAmount * (this.interestRate / 100) * this.durationMonths;
        this.remainingBalance = this.principalAmount + totalInterest;
    }
});

module.exports = mongoose.model('Loan', loanSchema);
