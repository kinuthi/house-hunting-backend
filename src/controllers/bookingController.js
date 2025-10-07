const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Payment = require('../models/Payment');

exports.createBooking = async (req, res) => {
    try {
        const {
            property,
            visitDate,
            visitTime,
            notes,
            numberOfProperties,
            cleaningService
        } = req.body;

        const propertyExists = await Property.findById(property);
        if (!propertyExists) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        // Prepare booking data
        const bookingData = {
            property,
            customer: req.user.id,
            visitDate,
            visitTime,
            notes,
            numberOfProperties: numberOfProperties || 1
        };

        // Add cleaning service if provided
        if (cleaningService) {
            bookingData.cleaningService = {
                required: cleaningService.required || false,
                fee: cleaningService.fee || 0,
                notes: cleaningService.notes || ''
            };
        }

        const booking = await Booking.create(bookingData);

        const populatedBooking = await Booking.findById(booking._id)
            .populate('property')
            .populate('customer', 'name email phone');

        // Create payment record for viewing fee (and cleaning fee if applicable)
        await Payment.create({
            paymentType: 'viewing_fee',
            booking: booking._id,
            property: propertyExists._id,
            customer: req.user.id,
            numberOfProperties: booking.numberOfProperties,
            totalAmount: booking.totalFee // Use totalFee which includes cleaning fee
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

exports.updateBooking = async (req, res) => {
    try {
        const {
            visitDate,
            visitTime,
            notes,
            numberOfProperties,
            cleaningService
        } = req.body;

        let booking = await Booking.findById(req.params.id).populate('property');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Check authorization
        if (req.user.role === 'customer' && booking.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (req.user.role === 'property_manager') {
            const property = await Property.findById(booking.property._id);
            if (property.propertyManager.toString() !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        // Prepare update data
        const updateData = {};
        if (visitDate) updateData.visitDate = visitDate;
        if (visitTime) updateData.visitTime = visitTime;
        if (notes !== undefined) updateData.notes = notes;
        if (numberOfProperties) updateData.numberOfProperties = numberOfProperties;
        if (cleaningService !== undefined) {
            updateData.cleaningService = {
                required: cleaningService.required || false,
                fee: cleaningService.fee || 0,
                notes: cleaningService.notes || ''
            };
        }

        booking = await Booking.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('property').populate('customer', 'name email phone');

        // Update payment record if booking details changed
        if (numberOfProperties || cleaningService !== undefined) {
            await Payment.findOneAndUpdate(
                { booking: booking._id, paymentType: 'viewing_fee' },
                {
                    numberOfProperties: booking.numberOfProperties,
                    totalAmount: booking.totalFee
                }
            );
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