const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const MoverBooking = require('../models/MoverBooking');
const MoverCompany = require('../models/MoverCompany');

exports.createBooking = async (req, res) => {
    try {
        const {
            property,
            visitDate,
            visitTime,
            notes,
            numberOfProperties,
            moveInCleaningService,
            movingService
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

        // Add move-in cleaning service if provided
        if (moveInCleaningService) {
            bookingData.moveInCleaningService = {
                required: moveInCleaningService.required || false,
                notes: moveInCleaningService.notes || ''
            };
        }

        // Add moving service if provided
        if (movingService && movingService.required) {
            // Validate mover company if moving service is requested
            if (movingService.moverCompany) {
                const moverCompany = await MoverCompany.findById(movingService.moverCompany);
                if (!moverCompany || !moverCompany.isActive) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid or inactive mover company'
                    });
                }
            }

            bookingData.movingService = {
                required: true,
                moveDate: movingService.moveDate,
                moveTime: movingService.moveTime,
                pickupAddress: movingService.pickupAddress,
                propertySize: movingService.propertySize,
                vehicleRequired: movingService.vehicleRequired,
                additionalServices: movingService.additionalServices || [],
                estimatedCost: movingService.estimatedCost || 0,
                specialInstructions: movingService.specialInstructions || '',
                notes: movingService.notes || ''
            };
        }

        const booking = await Booking.create(bookingData);

        const populatedBooking = await Booking.findById(booking._id)
            .populate('property')
            .populate('customer', 'name phone');

        // Create payment record for viewing fee only
        await Payment.create({
            paymentType: 'viewing_fee',
            booking: booking._id,
            property: propertyExists._id,
            customer: req.user.id,
            numberOfProperties: booking.numberOfProperties,
            totalAmount: booking.totalFee // totalFee only includes viewing fee
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
            .populate('customer', 'name phone')
            .populate('movingService.moverBooking')
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
            .populate('customer', 'name phone')
            .populate('movingService.moverBooking');

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
            moveInCleaningService,
            movingService
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
<<<<<<< HEAD

=======
>>>>>>> a716c5145d34b4b40c4042dbf18903fbe3e01e9f
        if (moveInCleaningService !== undefined) {
            updateData.moveInCleaningService = {
                required: moveInCleaningService.required || false,
                notes: moveInCleaningService.notes || ''
            };
        }

        if (movingService !== undefined) {
            if (movingService.required) {
                // Validate mover company if provided
                if (movingService.moverCompany) {
                    const moverCompany = await MoverCompany.findById(movingService.moverCompany);
                    if (!moverCompany || !moverCompany.isActive) {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid or inactive mover company'
                        });
                    }
                }

                updateData.movingService = {
                    required: true,
                    moverBooking: movingService.moverBooking || booking.movingService?.moverBooking,
                    moveDate: movingService.moveDate,
                    moveTime: movingService.moveTime,
                    pickupAddress: movingService.pickupAddress,
                    propertySize: movingService.propertySize,
                    vehicleRequired: movingService.vehicleRequired,
                    additionalServices: movingService.additionalServices || [],
                    estimatedCost: movingService.estimatedCost || 0,
                    specialInstructions: movingService.specialInstructions || '',
                    notes: movingService.notes || ''
                };
            } else {
                updateData.movingService = {
                    required: false
                };
            }
        }

        booking = await Booking.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('property')
            .populate('customer', 'name phone')
            .populate('movingService.moverBooking');

        // Update payment record if booking details changed
        if (numberOfProperties) {
            await Payment.findOneAndUpdate(
                { booking: booking._id, paymentType: 'viewing_fee' },
                {
                    numberOfProperties: booking.numberOfProperties,
                    totalAmount: booking.totalFee // totalFee only includes viewing fee
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
        )
            .populate('property')
            .populate('customer', 'name phone')
            .populate('movingService.moverBooking');

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Link mover booking to property booking
exports.linkMoverBooking = async (req, res) => {
    try {
        const { moverBookingId } = req.body;

        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Verify mover booking exists and belongs to this customer
        const moverBooking = await MoverBooking.findById(moverBookingId);
        if (!moverBooking) {
            return res.status(404).json({ success: false, message: 'Mover booking not found' });
        }

        if (moverBooking.customer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to link this mover booking' });
        }

        // Link the mover booking
        booking.movingService.required = true;
        booking.movingService.moverBooking = moverBookingId;
        await booking.save();

        booking = await Booking.findById(booking._id)
            .populate('property')
            .populate('customer', 'name phone')
            .populate('movingService.moverBooking');

        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};