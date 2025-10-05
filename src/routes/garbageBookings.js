const express = require('express');
const {
    createGarbageBooking,
    getGarbageBookings,
    getGarbageBooking,
    updateGarbageBookingStatus,
    processGarbagePayment
} = require('../controllers/garbageBookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, getGarbageBookings)
    .post(protect, authorize('customer'), createGarbageBooking);

router.route('/:id')
    .get(protect, getGarbageBooking)
    .put(protect, authorize('admin', 'garbage_collection_company', 'customer'), updateGarbageBookingStatus);

router.put('/:id/payment', protect, authorize('customer'), processGarbagePayment);

module.exports = router;