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
    numberOfProperties: {
        type: Number,
        default: 1,
        min: 1
    },
    viewingFee: {
        type: Number,
        default: 0
    },
    moveInCleaningService: {
        required: {
            type: Boolean,
            default: false
        },
        cleaningDate: {
            type: Date
        },
        cleaningTime: {
            type: String
        },
        notes: {
            type: String
        }
    },
    movingService: {
        required: {
            type: Boolean,
            default: false
        },
        moverBooking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MoverBooking'
        },
        moveDate: {
            type: Date
        },
        moveTime: {
            type: String
        },
        pickupAddress: {
            street: String,
            city: String,
            state: String,
            country: String,
            zipCode: String,
            floor: String,
            hasElevator: Boolean
        },
        propertySize: {
            type: String,
            enum: ['studio', '1_bedroom', '2_bedroom', '3_bedroom', '4_bedroom', '5+_bedroom', 'small_office', 'medium_office', 'large_office']
        },
        vehicleRequired: {
            type: String,
            enum: ['small_van', 'medium_truck', 'large_truck', 'extra_large_truck']
        },
        additionalServices: [{
            name: {
                type: String,
                enum: ['packing', 'unpacking', 'assembly', 'disassembly', 'storage', 'cleaning']
            },
            price: Number
        }],
        estimatedCost: {
            type: Number,
            default: 0
        },
        specialInstructions: String,
        notes: String
    },
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

bookingSchema.pre('save', function (next) {
    if (this.numberOfProperties <= 3) {
        this.viewingFee = 1500;
    } else {
        const additionalProperties = this.numberOfProperties - 3;
        const additionalSetsOf3 = Math.ceil(additionalProperties / 3);
        this.viewingFee = 1500 + (additionalSetsOf3 * 500);
    }

    this.totalFee = this.viewingFee;
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);