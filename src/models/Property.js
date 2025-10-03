const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    propertyType: {
        type: String,
        required: true,
        enum: ['apartment', 'house', 'villa', 'condo', 'townhouse', 'studio', 'land']
    },
    status: {
        type: String,
        enum: ['available', 'rented', 'sold', 'pending'],
        default: 'available'
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    bedrooms: {
        type: Number,
        required: true,
        min: 0
    },
    bathrooms: {
        type: Number,
        required: true,
        min: 0
    },
    area: {
        type: Number,
        required: [true, 'Please add area in square feet']
    },
    address: {
        street: String,
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
    amenities: [{
        type: String
    }],
    images: [{
        type: String
    }],
    propertyManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublished: {
        type: Boolean,
        default: false
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

propertySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Property', propertySchema);