const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Payment Settings
    downPaymentPercentage: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
    },
    managerCommissionEnabled: {
        type: Boolean,
        default: false
    },
    managerCommissionPercentage: {
        type: Number,
        default: 5,
        min: 0,
        max: 100
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