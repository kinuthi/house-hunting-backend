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
    // GeoJSON location for efficient geospatial queries
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude] - ORDER MATTERS!
            index: '2dsphere'
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
    viewCount: {
        type: Number,
        default: 0
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

// Create 2dsphere index for geospatial queries
propertySchema.index({ location: '2dsphere' });

// Index for common query patterns
propertySchema.index({ 'address.city': 1, status: 1, isPublished: 1 });
propertySchema.index({ propertyType: 1, status: 1, isPublished: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ propertyManager: 1 });
propertySchema.index({ createdAt: -1 });

// Text index for search functionality
propertySchema.index({
    title: 'text',
    description: 'text',
    'address.city': 'text',
    'address.street': 'text'
});

// Pre-save middleware to sync coordinates
propertySchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Sync address.coordinates with location for geospatial queries
    if (this.address && this.address.coordinates) {
        if (this.address.coordinates.longitude && this.address.coordinates.latitude) {
            this.location = {
                type: 'Point',
                coordinates: [
                    this.address.coordinates.longitude,
                    this.address.coordinates.latitude
                ]
            };
        }
    }

    next();
});

// Static method to find properties near a location
propertySchema.statics.findNearby = async function (longitude, latitude, maxDistanceKm = 50, filters = {}) {
    const query = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistanceKm * 1000 // Convert km to meters
            }
        },
        ...filters
    };

    return this.find(query).populate('propertyManager', 'name email phone');
};

// Static method to find properties within a bounding box
propertySchema.statics.findInBounds = async function (swLon, swLat, neLon, neLat, filters = {}) {
    const query = {
        location: {
            $geoWithin: {
                $box: [
                    [swLon, swLat], // Southwest corner
                    [neLon, neLat]  // Northeast corner
                ]
            }
        },
        ...filters
    };

    return this.find(query).populate('propertyManager', 'name email phone');
};

// Instance method to calculate distance to a point
propertySchema.methods.distanceTo = function (longitude, latitude) {
    if (!this.location || !this.location.coordinates) {
        return null;
    }

    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(latitude - this.location.coordinates[1]);
    const dLon = this.toRadians(longitude - this.location.coordinates[0]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRadians(this.location.coordinates[1])) *
        Math.cos(this.toRadians(latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
};

// Helper method for distance calculation
propertySchema.methods.toRadians = function (degrees) {
    return degrees * (Math.PI / 180);
};

// Virtual for full address
propertySchema.virtual('fullAddress').get(function () {
    const parts = [];
    if (this.address.street) parts.push(this.address.street);
    if (this.address.city) parts.push(this.address.city);
    if (this.address.state) parts.push(this.address.state);
    if (this.address.country) parts.push(this.address.country);
    if (this.address.zipCode) parts.push(this.address.zipCode);
    return parts.join(', ');
});

// Ensure virtuals are included in JSON output
propertySchema.set('toJSON', { virtuals: true });
propertySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Property', propertySchema);