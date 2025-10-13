const mongoose = require('mongoose');

const moverBookingSchema = new mongoose.Schema({
    moverCompany: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MoverCompany',
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movingDate: {
        type: Date,
        required: [true, 'Please provide a moving date']
    },
    movingTime: {
        type: String,
        required: [true, 'Please provide a moving time']
    },
    pickupAddress: {
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
        floor: String,
        hasElevator: Boolean,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    deliveryAddress: {
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
        floor: String,
        hasElevator: Boolean,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    distance: {
        type: Number, // in km
        required: true
    },
    moveType: {
        type: String,
        enum: ['residential', 'commercial', 'office', 'furniture', 'fragile_items', 'long_distance', 'local'],
        required: true
    },
    propertySize: {
        type: String,
        enum: ['studio', '1_bedroom', '2_bedroom', '3_bedroom', '4_bedroom', '5+_bedroom', 'small_office', 'medium_office', 'large_office'],
        required: true
    },
    vehicleRequired: {
        type: String,
        enum: ['small_van', 'medium_truck', 'large_truck', 'extra_large_truck'],
        required: true
    },
    itemsList: [{
        itemName: String,
        quantity: Number,
        isFragile: Boolean
    }],
    additionalServices: [{
        name: {
            type: String,
            enum: ['packing', 'unpacking', 'assembly', 'disassembly', 'storage', 'cleaning']
        },
        price: Number
    }],
    serviceAmount: {
        type: Number,
        required: true
    },
    // Platform commission (20% from mover company earnings)
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
    // Net amount for mover company (after platform commission)
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
    specialInstructions: {
        type: String
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

// Calculate platform commission and company earnings before saving
moverBookingSchema.pre('save', function (next) {
    // Calculate platform commission (20% of service amount)
    this.platformCommission.amount = (this.serviceAmount * this.platformCommission.percentage) / 100;

    // Calculate what the company will receive (80% of service amount)
    this.companyEarnings = this.serviceAmount - this.platformCommission.amount;

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MoverBooking', moverBookingSchema);