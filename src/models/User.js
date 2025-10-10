const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'property_manager', 'customer', 'garbage_collection_company'],
        default: 'customer'
    },
    phone: {
        type: String,
        trim: true
    },
    // Reference to garbage collection company profile if role is garbage_collection_company
    garbageCollectionProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarbageCollectionCompany'
    },
    // ID document verification only for property managers (removed for garbage_collection_company)
    idDocument: {
        front: {
            type: String, // URL to front of ID
            required: function () {
                return this.role === 'property_manager';
            }
        },
        back: {
            type: String, // URL to back of ID
            required: function () {
                return this.role === 'property_manager';
            }
        },
        idNumber: {
            type: String,
            required: function () {
                return this.role === 'property_manager';
            }
        },
        idType: {
            type: String,
            enum: ['national_id', 'passport', 'drivers_license'],
            required: function () {
                return this.role === 'property_manager';
            }
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    // Email verification fields (only for customers and admins, not property_manager)
    isEmailVerified: {
        type: Boolean,
        default: function () {
            // Auto-verify property managers - they go through approval process instead
            return this.role === 'property_manager';
        }
    },
    emailVerificationOTP: {
        type: String,
        select: false
    },
    emailVerificationOTPExpires: {
        type: Date,
        select: false
    },
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    // Account approval status (for property managers and garbage collection companies)
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: function () {
            return (this.role === 'property_manager' || this.role === 'garbage_collection_company')
                ? 'pending'
                : 'approved';
        }
    },
    approvalNotes: String,
    approvedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate email verification OTP (only used for customers and admins)
userSchema.methods.generateEmailVerificationOTP = function () {
    // Skip OTP generation for property managers
    if (this.role === 'property_manager') {
        return null;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and set to emailVerificationOTP field
    this.emailVerificationOTP = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    // Set expire time (10 minutes)
    this.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000;

    return otp;
};

// Verify OTP
userSchema.methods.verifyEmailOTP = async function (otp) {
    // Hash the provided OTP
    const hashedOTP = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    // Check if OTP matches and is not expired
    if (
        this.emailVerificationOTP === hashedOTP &&
        this.emailVerificationOTPExpires > Date.now()
    ) {
        return true;
    }
    return false;
};

module.exports = mongoose.model('User', userSchema);