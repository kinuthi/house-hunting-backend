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
    // Move-in cleaning service (optional, paid service)
    moveInCleaningService: {
        required: {
            type: Boolean,
            default: false
        },
        notes: {
            type: String
        }
    },
    // Total fee (only viewing fee, cleaning is separate/optional paid service)
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
// First 3 properties: 1500 KES
// Every additional 3 properties: 500 KES
// Examples:
// 1-3 properties = 1500 KES
// 4-6 properties = 1500 + 500 = 2000 KES
// 7-9 properties = 1500 + 500 + 500 = 2500 KES
bookingSchema.pre('save', function (next) {
    // Calculate viewing fee
    if (this.numberOfProperties <= 3) {
        // First 3 properties cost 1500 KES
        this.viewingFee = 1500;
    } else {
        // Additional properties after first 3
        const additionalProperties = this.numberOfProperties - 3;

        // Calculate how many sets of 3 additional properties
        // Math.ceil ensures we charge for partial sets too
        const additionalSetsOf3 = Math.ceil(additionalProperties / 3);

        // 1500 for first 3 + (500 per each set of 3 additional)
        this.viewingFee = 1500 + (additionalSetsOf3 * 500);
    }

    // Total fee is just the viewing fee
    // Move-in cleaning is a separate paid service handled elsewhere
    this.totalFee = this.viewingFee;

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);