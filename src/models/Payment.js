const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    propertyManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    downPaymentPercentage: {
        type: Number,
        required: true,
        default: 20,
        min: 0,
        max: 100
    },
    downPaymentAmount: {
        type: Number,
        required: true
    },
    remainingAmount: {
        type: Number,
        required: true
    },
    downPaymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    finalPaymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    // Property Manager Commission (optional)
    managerCommission: {
        enabled: {
            type: Boolean,
            default: false
        },
        percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        amount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        },
        paidAt: Date
    },
    // Payment tracking
    downPaymentPaidAt: Date,
    finalPaymentPaidAt: Date,
    paymentMethod: {
        type: String,
        enum: ['card', 'bank_transfer', 'mobile_money', 'cash'],
        default: 'card'
    },
    transactionIds: {
        downPayment: String,
        finalPayment: String,
        managerCommission: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Calculate amounts before saving
paymentSchema.pre('save', function (next) {
    this.downPaymentAmount = (this.totalAmount * this.downPaymentPercentage) / 100;
    this.remainingAmount = this.totalAmount - this.downPaymentAmount;

    if (this.managerCommission.enabled) {
        this.managerCommission.amount = (this.totalAmount * this.managerCommission.percentage) / 100;
    }

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);