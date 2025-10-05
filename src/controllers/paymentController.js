const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const GarbageCollectionBooking = require('../models/GarbageCollectionCompany');

// Process viewing fee payment
exports.processViewingFeePayment = async (req, res) => {
    try {
        const { transactionId, paymentMethod } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.paymentType !== 'viewing_fee') {
            return res.status(400).json({ success: false, message: 'This is not a viewing fee payment' });
        }

        if (payment.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (payment.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Payment already processed' });
        }

        // Process payment (integrate with payment gateway here)
        payment.paymentStatus = 'paid';
        payment.paymentMethod = paymentMethod || payment.paymentMethod;
        payment.transactionId = transactionId || `TXN-VIEW-${Date.now()}`;
        payment.paidAt = Date.now();

        await payment.save();

        // Update booking status to confirmed
        await Booking.findByIdAndUpdate(payment.booking, { status: 'confirmed' });

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process garbage collection payment
exports.processGarbageCollectionPayment = async (req, res) => {
    try {
        const { transactionId, paymentMethod } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.paymentType !== 'garbage_collection') {
            return res.status(400).json({ success: false, message: 'This is not a garbage collection payment' });
        }

        if (payment.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (payment.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Payment already processed' });
        }

        // Process payment (integrate with payment gateway here)
        payment.paymentStatus = 'paid';
        payment.paymentMethod = paymentMethod || payment.paymentMethod;
        payment.transactionId = transactionId || `TXN-GARBAGE-${Date.now()}`;
        payment.paidAt = Date.now();

        await payment.save();

        // Update garbage booking status to confirmed
        await GarbageCollectionBooking.findByIdAndUpdate(payment.garbageBooking, {
            status: 'confirmed',
            paymentStatus: 'paid'
        });

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Pay commission to garbage collection company
exports.payCommissionToCompany = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('garbageCollectionCompany');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.paymentType !== 'garbage_collection') {
            return res.status(400).json({ success: false, message: 'This is not a garbage collection payment' });
        }

        if (payment.paymentStatus !== 'paid') {
            return res.status(400).json({ success: false, message: 'Customer payment must be completed first' });
        }

        if (payment.commissionPaidToCompany) {
            return res.status(400).json({ success: false, message: 'Commission already paid to company' });
        }

        // Check if service is completed
        const garbageBooking = await GarbageCollectionBooking.findById(payment.garbageBooking);
        if (garbageBooking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Service must be completed before paying commission' });
        }

        payment.commissionPaidToCompany = true;
        payment.commissionPaidAt = Date.now();

        await payment.save();

        // Update garbage booking
        await GarbageCollectionBooking.findByIdAndUpdate(payment.garbageBooking, {
            commissionPaidToCompany: true,
            commissionPaidAt: Date.now()
        });

        res.status(200).json({
            success: true,
            message: `Commission of ${payment.companyEarnings} paid to ${payment.garbageCollectionCompany.companyName}`,
            data: payment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payment by ID
exports.getPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('booking')
            .populate('property')
            .populate('garbageBooking')
            .populate('garbageCollectionCompany')
            .populate('customer', 'name email phone');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Check authorization
        if (req.user.role === 'customer' && payment.customer._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all payments with filters
exports.getPayments = async (req, res) => {
    try {
        const { paymentType, paymentStatus } = req.query;
        let query = {};

        if (req.user.role === 'customer') {
            query.customer = req.user.id;
        } else if (req.user.role === 'garbage_collection_company') {
            const User = require('../models/User');
            const user = await User.findById(req.user.id);
            if (user.garbageCollectionProfile) {
                query.garbageCollectionCompany = user.garbageCollectionProfile;
                query.paymentType = 'garbage_collection';
            }
        }

        // Apply filters
        if (paymentType) query.paymentType = paymentType;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const payments = await Payment.find(query)
            .populate('booking')
            .populate('property')
            .populate('garbageBooking')
            .populate('garbageCollectionCompany')
            .populate('customer', 'name email phone')
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
            .populate('customer', 'name email phone');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found for this booking' });
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get payment by garbage booking ID
exports.getPaymentByGarbageBooking = async (req, res) => {
    try {
        const payment = await Payment.findOne({ garbageBooking: req.params.garbageBookingId })
            .populate('garbageBooking')
            .populate('garbageCollectionCompany')
            .populate('customer', 'name email phone');

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found for this garbage booking' });
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};