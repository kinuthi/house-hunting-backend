const mongoose = require('mongoose');

const garbageCollectionBookingSchema = new mongoose.Schema({
    garbageCollectionCompany: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarbageCollectionCompany',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceDate: {
        type: Date,
        required: [true, 'Please provide a service date']
    },
    serviceTime: {
        type: String,
        required: [true, 'Please provide a service time']
    },
    serviceAddress: {
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: String,
        country: {
            type: String,
            required: true
        },
        zipCode: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    wasteType: {
        type: String,
        enum: ['household', 'commercial', 'recyclable', 'hazardous', 'construction'],
        required: true
    },
    estimatedWeight: {
        type: Number, // in kg
        required: true
    },
    serviceAmount: {
        type: Number,
        required: true
    },
    // Platform commission (20% from garbage collection company earnings)
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
    // Net amount for garbage collection company (after platform commission)
    companyEarnings: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    commissionPaidToCompany: {
        type: Boolean,
        default: false
    },
    commissionPaidAt: Date,
    transactionId: String,
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

// Calculate platform commission and company earnings before saving
garbageCollectionBookingSchema.pre('save', function (next) {
    // Calculate platform commission (20% of service amount)
    this.platformCommission.amount = (this.serviceAmount * this.platformCommission.percentage) / 100;

    // Calculate what the company will receive (80% of service amount)
    this.companyEarnings = this.serviceAmount - this.platformCommission.amount;

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('GarbageCollectionBooking', garbageCollectionBookingSchema);