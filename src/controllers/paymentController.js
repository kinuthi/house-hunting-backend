const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Settings = require('../models/Settings');

// Initialize payment for a booking
exports.createPayment = async (req, res) => {
    try {
        const { bookingId, paymentMethod } = req.body;

        const booking = await Booking.findById(bookingId).populate('property');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Check if customer owns the booking
        if (booking.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Check if payment already exists
        const existingPayment = await Payment.findOne({ booking: bookingId });
        if (existingPayment) {
            return res.status(400).json({ success: false, message: 'Payment already exists for this booking' });
        }

        // Get global settings
        const settings = await Settings.findOne({ settingType: 'global' });
        const downPaymentPercentage = settings?.downPaymentPercentage || 20;
        const managerCommissionEnabled = settings?.managerCommissionEnabled || false;
        const managerCommissionPercentage = settings?.managerCommissionPercentage || 5;

        const payment = await Payment.create({
            booking: booking._id,
            property: booking.property._id,
            customer: req.user.id,
            propertyManager: booking.property.propertyManager,
            totalAmount: booking.property.price,
            downPaymentPercentage,
            paymentMethod,
            managerCommission: {
                enabled: managerCommissionEnabled,
                percentage: managerCommissionPercentage
            }
        });

        const populatedPayment = await Payment.findById(payment._id)
            .populate('booking')
            .populate('property')
            .populate('customer', 'name email phone')
            .populate('propertyManager', 'name email phone');

        res.status(201).json({ success: true, data: populatedPayment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process down payment
exports.processDownPayment = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (payment.downPaymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Down payment already processed' });
        }

        // Here you would integrate with actual payment gateway
        // For now, we'll simulate successful payment
        payment.downPaymentStatus = 'paid';
        payment.downPaymentPaidAt = Date.now();
        payment.transactionIds.downPayment = transactionId || `TXN-DOWN-${Date.now()}`;

        await payment.save();

        // Update booking status to confirmed
        await Booking.findByIdAndUpdate(payment.booking, { status: 'confirmed' });

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process final payment
exports.processFinalPayment = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (payment.downPaymentStatus !== 'paid') {
            return res.status(400).json({ success: false, message: 'Down payment must be completed first' });
        }

        if (payment.finalPaymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Final payment already processed' });
        }

        // Here you would integrate with actual payment gateway
        payment.finalPaymentStatus = 'paid';
        payment.finalPaymentPaidAt = Date.now();
        payment.transactionIds.finalPayment = transactionId || `TXN-FINAL-${Date.now()}`;

        await payment.save();

        // Update booking status to completed
        await Booking.findByIdAndUpdate(payment.booking, { status: 'completed' });

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process manager commission payment
exports.processManagerCommission = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Only admin or the property manager can process commission
        if (req.user.role !== 'admin' && payment.propertyManager.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (!payment.managerCommission.enabled) {
            return res.status(400).json({ success: false, message: 'Manager commission is not enabled' });
        }

        if (payment.managerCommission.status === 'paid') {
            return res.status(400).json({ success: false, message: 'Commission already paid' });
        }

        if (payment.finalPaymentStatus !== 'paid') {
            return res.status(400).json({ success: false, message: 'Final payment must be completed first' });
        }

        payment.managerCommission.status = 'paid';
        payment.managerCommission.paidAt = Date.now();
        payment.transactionIds.managerCommission = transactionId || `TXN-COMM-${Date.now()}`;

        await payment.save();

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payment details
exports.getPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('booking')
            .populate('property')
            .populate('customer', 'name email phone')
            .populate('propertyManager', 'name email phone');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Check authorization
        if (req.user.role === 'customer' && payment.customer._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (req.user.role === 'property_manager' && payment.propertyManager._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all payments (with filters)
exports.getPayments = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'customer') {
            query.customer = req.user.id;
        } else if (req.user.role === 'property_manager') {
            query.propertyManager = req.user.id;
        }

        const payments = await Payment.find(query)
            .populate('booking')
            .populate('property')
            .populate('customer', 'name email phone')
            .populate('propertyManager', 'name email phone')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payment by booking ID
exports.getPaymentByBooking = async (req, res) => {
    try {
        const payment = await Payment.findOne({ booking: req.params.bookingId })
            .populate('booking')
            .populate('property')
            .populate('customer', 'name email phone')
            .populate('propertyManager', 'name email phone');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found for this booking' });
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};