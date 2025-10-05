const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentType: {
        type: String,
        enum: ['viewing_fee', 'garbage_collection'],
        required: true
    },
    // Property viewing fields
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: function () {
            return this.paymentType === 'viewing_fee';
        }
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: function () {
            return this.paymentType === 'viewing_fee';
        }
    },
    viewingFee: {
        type: Number,
        default: 0
    },
    numberOfProperties: {
        type: Number,
        default: 1
    },
    // Garbage collection fields
    garbageBooking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarbageCollectionBooking',
        required: function () {
            return this.paymentType === 'garbage_collection';
        }
    },
    garbageCollectionCompany: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarbageCollectionCompany',
        required: function () {
            return this.paymentType === 'garbage_collection';
        }
    },
    // Platform commission for garbage collection (20%)
    platformCommission: {
        percentage: {
            type: Number,
            default: 20,
            min: 0,
            max: 100
        },
        amount: {
            type: Number,
            default: 0
        }
    },
    // Company earnings (80% after platform commission)
    companyEarnings: {
        type: Number,
        default: 0
    },
    commissionPaidToCompany: {
        type: Boolean,
        default: false
    },
    commissionPaidAt: Date,
    // Common fields
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'bank_transfer', 'mobile_money', 'cash'],
        default: 'card'
    },
    transactionId: String,
    paidAt: Date,
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
    if (this.paymentType === 'viewing_fee') {
        // Calculate viewing fee: 1500 for first 3 properties, 500 for each additional
        if (this.numberOfProperties <= 3) {
            this.viewingFee = 1500;
        } else {
            const additionalProperties = this.numberOfProperties - 3;
            this.viewingFee = 1500 + (additionalProperties * 500);
        }
        this.totalAmount = this.viewingFee;
    } else if (this.paymentType === 'garbage_collection') {
        // Calculate platform commission (20%) and company earnings (80%)
        this.platformCommission.amount = (this.totalAmount * this.platformCommission.percentage) / 100;
        this.companyEarnings = this.totalAmount - this.platformCommission.amount;
    }

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);