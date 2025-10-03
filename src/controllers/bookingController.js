const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');

exports.createBooking = async (req, res) => {
    try {
        const { property, visitDate, visitTime, notes } = req.body;

        const propertyExists = await Property.findById(property);
        if (!propertyExists) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        const booking = await Booking.create({
            property,
            customer: req.user.id,
            visitDate,
            visitTime,
            notes
        });

        const populatedBooking = await Booking.findById(booking._id)
            .populate('property')
            .populate('customer', 'name email phone');

        // Get settings for payment calculation
        const settings = await Settings.findOne({ settingType: 'global' });
        const downPaymentPercentage = settings?.downPaymentPercentage || 20;
        const managerCommissionEnabled = settings?.managerCommissionEnabled || false;
        const managerCommissionPercentage = settings?.managerCommissionPercentage || 5;

        // Calculate payment amounts
        const totalAmount = propertyExists.price;
        const downPaymentAmount = (totalAmount * downPaymentPercentage) / 100;
        const remainingAmount = totalAmount - downPaymentAmount;
        const managerCommissionAmount = managerCommissionEnabled
            ? (totalAmount * managerCommissionPercentage) / 100
            : 0;

        // Create payment record with calculated amounts
        await Payment.create({
            booking: booking._id,
            property: propertyExists._id,
            customer: req.user.id,
            propertyManager: propertyExists.propertyManager,
            totalAmount: totalAmount,
            downPaymentPercentage: downPaymentPercentage,
            downPaymentAmount: downPaymentAmount,
            remainingAmount: remainingAmount,
            managerCommission: {
                enabled: managerCommissionEnabled,
                percentage: managerCommissionPercentage,
                amount: managerCommissionAmount
            }
        });

        res.status(201).json({ success: true, data: populatedBooking });
    } catch (error) {
        console.error('Booking creation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBookings = async (req, res) => {
    try {
        let query = {};

        if (req.user.role === 'customer') {
            query.customer = req.user.id;
        } else if (req.user.role === 'property_manager') {
            const properties = await Property.find({ propertyManager: req.user.id }).select('_id');
            const propertyIds = properties.map(p => p._id);
            query.property = { $in: propertyIds };
        }

        const bookings = await Booking.find(query)
            .populate('property')
            .populate('customer', 'name email phone')
            .sort('-createdAt');

        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('property')
            .populate('customer', 'name email phone');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (req.user.role === 'customer' && booking.customer._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (req.user.role === 'property_manager') {
            const property = await Property.findById(booking.property._id);
            if (property.propertyManager.toString() !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let booking = await Booking.findById(req.params.id).populate('property');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (req.user.role === 'property_manager') {
            const property = await Property.findById(booking.property._id);
            if (property.propertyManager.toString() !== req.user.id) {
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

        booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate('property').populate('customer', 'name email phone');

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};