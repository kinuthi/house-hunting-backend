const express = require('express');
const {
    createBooking,
    getBookings,
    getBooking,
    updateBookingStatus
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, getBookings)
    .post(protect, authorize('customer'), createBooking);

router.route('/:id')
    .get(protect, getBooking)
    .put(protect, authorize('admin', 'property_manager', 'customer'), updateBookingStatus);

module.exports = router;