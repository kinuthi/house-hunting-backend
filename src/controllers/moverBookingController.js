const MoverBooking = require('../models/MoverBooking');
const MoverCompany = require('../models/MoverCompany');
const User = require('../models/User');
const Payment = require('../models/Payment');

// Create a mover booking
exports.createMoverBooking = async (req, res) => {
    try {
        const {
            moverCompany,
            movingDate,
            movingTime,
            pickupAddress,
            deliveryAddress,
            distance,
            moveType,
            propertySize,
            vehicleRequired,
            itemsList,
            additionalServices,
            specialInstructions,
            notes
        } = req.body;

        // Verify company exists and is active
        const company = await MoverCompany.findById(moverCompany);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Mover company not found' });
        }

        if (!company.isActive) {
            return res.status(400).json({ success: false, message: 'This company is not currently accepting bookings' });
        }

        // Calculate service amount based on company pricing
        let serviceAmount = company.pricing.baseRate + (distance * company.pricing.ratePerKm);

        // Add additional services cost
        if (additionalServices && additionalServices.length > 0) {
            const additionalCost = additionalServices.reduce((sum, service) => sum + (service.price || 0), 0);
            serviceAmount += additionalCost;
        }

        // Check minimum charge
        const finalAmount = company.pricing.minimumCharge
            ? Math.max(serviceAmount, company.pricing.minimumCharge)
            : serviceAmount;

        // Create booking
        const booking = await MoverBooking.create({
            moverCompany,
            customer: req.user.id,
            movingDate,
            movingTime,
            pickupAddress,
            deliveryAddress,
            distance,
            moveType,
            propertySize,
            vehicleRequired,
            itemsList,
            additionalServices,
            serviceAmount: finalAmount,
            specialInstructions,
            notes
        });

        const populatedBooking = await MoverBooking.findById(booking._id)
            .populate('moverCompany')
            .populate('customer', 'name phone');

        // Create payment record
        await Payment.create({
            paymentType: 'moving_service',
            moverBooking: booking._id,
            moverCompany: company._id,
            customer: req.user.id,
            totalAmount: finalAmount
        });

        res.status(201).json({ success: true, data: populatedBooking });
    } catch (error) {
        console.error('Mover booking creation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all mover bookings
exports.getMoverBookings = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'customer') {
            query.customer = req.user.id;
        } else if (req.user.role === 'mover_company') {
            const user = await User.findById(req.user.id);
            if (!user.moverCompanyProfile) {
                return res.status(403).json({ success: false, message: 'No company profile found' });
            }
            query.moverCompany = user.moverCompanyProfile;
        }

        const bookings = await MoverBooking.find(query)
            .populate('moverCompany')
            .populate('customer', 'name phone')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single mover booking
exports.getMoverBooking = async (req, res) => {
    try {
        const booking = await MoverBooking.findById(req.params.id)
            .populate('moverCompany')
            .populate('customer', 'name phone');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Check authorization
        if (req.user.role === 'customer' && booking.customer._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (req.user.role === 'mover_company') {
            const user = await User.findById(req.user.id);
            if (booking.moverCompany._id.toString() !== user.moverCompanyProfile.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update booking status
exports.updateMoverBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let booking = await MoverBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Authorization checks
        if (req.user.role === 'mover_company') {
            const user = await User.findById(req.user.id);
            if (booking.moverCompany.toString() !== user.moverCompanyProfile.toString()) {
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

        booking = await MoverBooking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate('moverCompany').populate('customer', 'name phone');

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process payment for moving service
exports.processMoverPayment = async (req, res) => {
    try {
        const { transactionId, paymentMethod } = req.body;
        const booking = await MoverBooking.findById(req.params.id);

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
        const payment = await Payment.findOne({ moverBooking: booking._id });
        if (payment) {
            payment.paymentStatus = 'paid';
            payment.paymentMethod = paymentMethod || payment.paymentMethod;
            payment.transactionId = transactionId || `TXN-MOVER-${Date.now()}`;
            payment.paidAt = Date.now();
            await payment.save();
        }

        // Update booking
        booking.paymentStatus = 'paid';
        booking.transactionId = transactionId || `TXN-MOVER-${Date.now()}`;
        booking.status = 'confirmed';
        await booking.save();

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};