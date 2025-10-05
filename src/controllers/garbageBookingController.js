const GarbageCollectionBooking = require('../models/GarbageCollectionBooking');
const GarbageCollectionCompany = require('../models/GarbageCollectionCompany');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Create a garbage collection booking
exports.createGarbageBooking = async (req, res) => {
    try {
        const {
            garbageCollectionCompany,
            serviceDate,
            serviceTime,
            serviceAddress,
            wasteType,
            estimatedWeight,
            notes
        } = req.body;

        // Verify company exists and is active
        const company = await GarbageCollectionCompany.findById(garbageCollectionCompany);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Garbage collection company not found' });
        }

        if (!company.isActive) {
            return res.status(400).json({ success: false, message: 'This company is not currently accepting bookings' });
        }

        // Calculate service amount based on company pricing
        const serviceAmount = company.pricing.baseRate + (estimatedWeight * company.pricing.ratePerKg);

        // Check minimum charge
        const finalAmount = company.pricing.minimumCharge
            ? Math.max(serviceAmount, company.pricing.minimumCharge)
            : serviceAmount;

        // Create booking
        const booking = await GarbageCollectionBooking.create({
            garbageCollectionCompany,
            customer: req.user.id,
            serviceDate,
            serviceTime,
            serviceAddress,
            wasteType,
            estimatedWeight,
            serviceAmount: finalAmount,
            notes
        });

        const populatedBooking = await GarbageCollectionBooking.findById(booking._id)
            .populate('garbageCollectionCompany')
            .populate('customer', 'name email phone');

        // Create payment record
        await Payment.create({
            paymentType: 'garbage_collection',
            garbageBooking: booking._id,
            garbageCollectionCompany: company._id,
            customer: req.user.id,
            totalAmount: finalAmount
        });

        res.status(201).json({ success: true, data: populatedBooking });
    } catch (error) {
        console.error('Garbage booking creation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all garbage collection bookings
exports.getGarbageBookings = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'customer') {
            query.customer = req.user.id;
        } else if (req.user.role === 'garbage_collection_company') {
            const user = await User.findById(req.user.id);
            if (!user.garbageCollectionProfile) {
                return res.status(403).json({ success: false, message: 'No company profile found' });
            }
            query.garbageCollectionCompany = user.garbageCollectionProfile;
        }

        const bookings = await GarbageCollectionBooking.find(query)
            .populate('garbageCollectionCompany')
            .populate('customer', 'name email phone')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single garbage collection booking
exports.getGarbageBooking = async (req, res) => {
    try {
        const booking = await GarbageCollectionBooking.findById(req.params.id)
            .populate('garbageCollectionCompany')
            .populate('customer', 'name email phone');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Check authorization
        if (req.user.role === 'customer' && booking.customer._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (req.user.role === 'garbage_collection_company') {
            const user = await User.findById(req.user.id);
            if (booking.garbageCollectionCompany._id.toString() !== user.garbageCollectionProfile.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update booking status
exports.updateGarbageBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let booking = await GarbageCollectionBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Authorization checks
        if (req.user.role === 'garbage_collection_company') {
            const user = await User.findById(req.user.id);
            if (booking.garbageCollectionCompany.toString() !== user.garbageCollectionProfile.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        } else if (req.user.role === 'customer') {
            if (booking.customer.toString() !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
            if (status !== 'cancelled') {
                return res.status(403).json({ success: false, message: 'Customers can only cancel bookings' });
            }
        }

        booking = await GarbageCollectionBooking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate('garbageCollectionCompany').populate('customer', 'name email phone');

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process payment for garbage collection service
exports.processGarbagePayment = async (req, res) => {
    try {
        const { transactionId, paymentMethod } = req.body;
        const booking = await GarbageCollectionBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (booking.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Payment already processed' });
        }

        // Find and update payment record
        const payment = await Payment.findOne({ garbageBooking: booking._id });
        if (payment) {
            payment.paymentStatus = 'paid';
            payment.paymentMethod = paymentMethod || payment.paymentMethod;
            payment.transactionId = transactionId || `TXN-GARBAGE-${Date.now()}`;
            payment.paidAt = Date.now();
            await payment.save();
        }

        // Update booking
        booking.paymentStatus = 'paid';
        booking.transactionId = transactionId || `TXN-GARBAGE-${Date.now()}`;
        booking.status = 'confirmed';
        await booking.save();

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};