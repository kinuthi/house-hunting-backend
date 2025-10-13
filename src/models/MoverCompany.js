const mongoose = require('mongoose');

const moverCompanySchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Please add company name'],
        trim: true,
        unique: true
    },
    registrationNumber: {
        type: String,
        required: [true, 'Please add registration number'],
        unique: true
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
        unique: true,
        trim: true
    },
    contactPerson: {
        name: {
            type: String,
            required: true
        },
        phone: String
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
        zipCode: String
    },
    serviceAreas: [{
        city: String,
        state: String,
        zipCodes: [String]
    }],
    servicesOffered: [{
        type: String,
        enum: ['residential', 'commercial', 'office', 'furniture', 'fragile_items', 'long_distance', 'local']
    }],
    vehicleFleet: [{
        vehicleType: {
            type: String,
            enum: ['small_van', 'medium_truck', 'large_truck', 'extra_large_truck']
        },
        capacity: String, // e.g., "1-2 bedroom", "3-4 bedroom"
        quantity: Number
    }],
    pricing: {
        baseRate: {
            type: Number,
            required: true
        },
        ratePerKm: {
            type: Number,
            required: true
        },
        hourlyRate: Number,
        minimumCharge: Number
    },
    // Platform commission (20% of what they make)
    platformCommissionPercentage: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
    },
    // Banking details for payments
    bankDetails: {
        bankName: String,
        accountNumber: String,
        accountName: String,
        swiftCode: String
    },
    // Documents
    documents: {
        businessLicense: String,
        insuranceCertificate: String,
        taxCertificate: String,
        vehicleRegistrations: [String]
    },
    // Additional services
    additionalServices: [{
        name: {
            type: String,
            enum: ['packing', 'unpacking', 'assembly', 'disassembly', 'storage', 'cleaning']
        },
        price: Number
    }],
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
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

moverCompanySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MoverCompany', moverCompanySchema);