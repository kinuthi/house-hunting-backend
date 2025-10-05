const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Garbage Collection Commission Settings
    garbageCollectionCommissionPercentage: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
    },
    // Property Viewing Fee Settings
    viewingFeeBase: {
        type: Number,
        default: 1500, // Fee for first 3 properties
        min: 0
    },
    viewingFeeAdditional: {
        type: Number,
        default: 500, // Fee per additional property after 3
        min: 0
    },
    viewingFeeThreshold: {
        type: Number,
        default: 3, // Number of properties included in base fee
        min: 1
    },
    // Other settings can be added here
    settingType: {
        type: String,
        default: 'global',
        enum: ['global']
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

settingsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Settings', settingsSchema);