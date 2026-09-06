const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    phone: {
        type: String,
        // Not required for Google-auth users (they may not have a phone)
        required: function () { return this.authProvider !== 'google'; },
        trim: true,
        default: ''
    },
    password: {
        type: String,
        // Only required for password-based (traditional) signups
        required: function () { return this.authProvider === 'password'; },
        minlength: [8, 'Password must be at least 8 characters long.'],
        select: false // Password hash is never returned in default queries
    },
    address: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['LENDER', 'BORROWER'],
        required: true
    },
    isVerified: {
        type: Boolean,
        default: true
    },
    emailNotifications: {
        type: Boolean,
        default: true
    },
    // ── Firebase Auth Fields ────────────────────────────────
    authProvider: {
        type: String,
        enum: ['password', 'phone', 'google'],
        default: 'password'
    },
    firebaseUid: {
        type: String,
        default: ''
    },
    countryCode: {
        type: String,
        default: '+91'
    },
    photoURL: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Unique phone index — only enforced when phone is non-empty
userSchema.index(
    { phone: 1 },
    { unique: true, partialFilterExpression: { phone: { $exists: true, $ne: '' } } }
);

// Convert role to uppercase before validation
userSchema.pre('validate', function () {
    if (this.isModified('role') && this.role) {
        this.role = this.role.toUpperCase();
    }
});

// Hash password before saving (only when password exists and is modified)
userSchema.pre('save', function () {
    if (!this.password || !this.isModified('password')) return;
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compareSync(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
