const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
        unique: true,
        trim: true
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
    // Reference to garbage collection company profile if role is garbage_collection_company
    garbageCollectionProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarbageCollectionCompany'
    },
    // ID document verification only for property managers
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

module.exports = mongoose.model('User', userSchema);