const express = require('express');
const {
    createMoverBooking,
    getMoverBookings,
    getMoverBooking,
    updateMoverBookingStatus,
    processMoverPayment
} = require('../controllers/moverBookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, getMoverBookings)
    .post(protect, authorize('customer'), createMoverBooking);

router.route('/:id')
    .get(protect, getMoverBooking);

router.route('/:id/status')
    .put(protect, authorize('admin', 'mover_company', 'customer'), updateMoverBookingStatus);

router.route('/:id/payment')
    .post(protect, authorize('customer'), processMoverPayment);

module.exports = router;