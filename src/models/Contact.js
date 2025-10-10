const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        trim: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
        trim: true,
        match: [
            /^[+]?[\d\s\-()]+$/,
            'Please provide a valid phone number'
        ]
    },
    subject: {
        type: String,
        required: [true, 'Please add a subject'],
        trim: true,
        maxlength: [200, 'Subject cannot be more than 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Please add a message'],
        trim: true,
        maxlength: [2000, 'Message cannot be more than 2000 characters']
    },
    status: {
        type: String,
        enum: ['new', 'read', 'replied', 'resolved'],
        default: 'new'
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

// Index for common query patterns
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

// Text index for search functionality
contactSchema.index({
    name: 'text',
    email: 'text',
    subject: 'text',
    message: 'text'
});

// Pre-save middleware to update timestamp
contactSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to get contacts by status
contactSchema.statics.getByStatus = async function (status) {
    return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get unread contacts count
contactSchema.statics.getUnreadCount = async function () {
    return this.countDocuments({ status: 'new' });
};

// Instance method to mark as read
contactSchema.methods.markAsRead = async function () {
    this.status = 'read';
    return this.save();
};

// Instance method to mark as replied
contactSchema.methods.markAsReplied = async function () {
    this.status = 'replied';
    return this.save();
};

// Instance method to mark as resolved
contactSchema.methods.markAsResolved = async function () {
    this.status = 'resolved';
    return this.save();
};

module.exports = mongoose.model('Contact', contactSchema);