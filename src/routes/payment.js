const express = require('express');
const {
    processViewingFeePayment,
    processGarbageCollectionPayment,
    payCommissionToCompany,
    getPayment,
    getPayments,
    getPaymentByBooking,
    getPaymentByGarbageBooking
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, getPayments);

router.route('/:id')
    .get(protect, getPayment);

// Process viewing fee payment
router.put('/:id/viewing-fee', protect, authorize('customer'), processViewingFeePayment);

// Process garbage collection payment
router.put('/:id/garbage-collection', protect, authorize('customer'), processGarbageCollectionPayment);

// Admin pays commission to garbage collection company
router.put('/:id/pay-commission', protect, authorize('admin'), payCommissionToCompany);

// Get payment by booking ID
router.get('/booking/:bookingId', protect, getPaymentByBooking);

// Get payment by garbage booking ID
router.get('/garbage-booking/:garbageBookingId', protect, getPaymentByGarbageBooking);

module.exports = router;