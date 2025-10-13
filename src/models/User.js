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
        enum: ['admin', 'property_manager', 'customer', 'garbage_collection_company', 'mover_company'],
        default: 'customer'
    },
    // Reference to garbage collection company profile if role is garbage_collection_company
    garbageCollectionProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarbageCollectionCompany'
    },
    // Reference to mover company profile if role is mover_company
    moverCompanyProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MoverCompany'
    },
    // ID document verification for property managers and mover companies
    idDocument: {
        front: {
            type: String, // URL to front of ID
            required: function () {
                return this.role === 'property_manager' || this.role === 'mover_company';
            }
        },
        back: {
            type: String, // URL to back of ID
            required: function () {
                return this.role === 'property_manager' || this.role === 'mover_company';
            }
        },
        idNumber: {
            type: String,
            required: function () {
                return this.role === 'property_manager' || this.role === 'mover_company';
            }
        },
        idType: {
            type: String,
            enum: ['national_id', 'passport', 'drivers_license'],
            required: function () {
                return this.role === 'property_manager' || this.role === 'mover_company';
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
    // Account approval status (for property managers, garbage collection companies, and mover companies)
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
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