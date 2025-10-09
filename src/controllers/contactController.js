const Contact = require('../models/Contact');
const emailService = require('../services/email');

// Submit contact form
exports.createContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validation
        if (!name || !email || !phone || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Create contact
        const contact = await Contact.create({
            name,
            email,
            phone,
            subject,
            message,
            status: 'new'
        });

        // Send notification email to admin
        try {
            await emailService.sendContactNotificationToAdmin({
                name,
                email,
                phone,
                subject,
                message,
                contactId: contact._id
            });
            console.log('Contact notification sent to admin');
        } catch (emailError) {
            console.error('Failed to send admin notification:', emailError);
            // Don't fail the request if email fails
        }

        // Send confirmation email to customer
        try {
            await emailService.sendContactConfirmationToCustomer(email, {
                name,
                subject
            });
            console.log('Contact confirmation sent to customer:', email);
        } catch (emailError) {
            console.error('Failed to send customer confirmation:', emailError);
            // Don't fail the request if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Thank you for contacting us! We will get back to you soon.',
            data: contact
        });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all contacts (Admin only)
exports.getAllContacts = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query = status ? { status } : {};

        const contacts = await Contact.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Contact.countDocuments(query);

        res.status(200).json({
            success: true,
            data: contacts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single contact (Admin only)
exports.getContact = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // Mark as read if status is new
        if (contact.status === 'new') {
            await contact.markAsRead();
        }

        res.status(200).json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Get contact error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update contact status (Admin only)
exports.updateContactStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        if (!['new', 'read', 'replied', 'resolved'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        contact.status = status;
        await contact.save();

        res.status(200).json({
            success: true,
            message: 'Contact status updated successfully',
            data: contact
        });
    } catch (error) {
        console.error('Update contact status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete contact (Admin only)
exports.deleteContact = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        await contact.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get unread contacts count (Admin only)
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Contact.getUnreadCount();

        res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get contacts by status (Admin only)
exports.getContactsByStatus = async (req, res) => {
    try {
        const { status } = req.params;

        if (!['new', 'read', 'replied', 'resolved'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const contacts = await Contact.getByStatus(status);

        res.status(200).json({
            success: true,
            data: contacts
        });
    } catch (error) {
        console.error('Get contacts by status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};