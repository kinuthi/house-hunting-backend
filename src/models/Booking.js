const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
    visitDate: {
        type: Date,
        required: [true, 'Please provide a visit date']
    },
    visitTime: {
        type: String,
        required: [true, 'Please provide a visit time']
    },
    // Property viewing tracking
    numberOfProperties: {
        type: Number,
        default: 1,
        min: 1
    },
    viewingFee: {
        type: Number,
        default: 0
    },
    // Cleaning service (optional) - no fee charged
    cleaningService: {
        required: {
            type: Boolean,
            default: false
        },
        notes: {
            type: String
        }
    },
    // Total fee (only viewing fee)
    totalFee: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String
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

// Calculate viewing fee and total fee before saving
// 1500 for first 3 properties, 500 for each additional property
bookingSchema.pre('save', function (next) {
    // Calculate viewing fee
    if (this.numberOfProperties <= 3) {
        this.viewingFee = 1500;
    } else {
        const additionalProperties = this.numberOfProperties - 3;
        this.viewingFee = 1500 + (additionalProperties * 500);
    }

    // Total fee is just the viewing fee (cleaning is free)
    this.totalFee = this.viewingFee;

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);