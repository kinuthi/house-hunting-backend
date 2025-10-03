const express = require('express');
const {
    createPayment,
    processDownPayment,
    processFinalPayment,
    processManagerCommission,
    getPayment,
    getPayments,
    getPaymentByBooking
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(protect, getPayments)
    .post(protect, authorize('customer'), createPayment);

router.route('/:id')
    .get(protect, getPayment);

router.put('/:id/down-payment', protect, authorize('customer'), processDownPayment);
router.put('/:id/final-payment', protect, authorize('customer'), processFinalPayment);
router.put('/:id/manager-commission', protect, authorize('admin', 'property_manager'), processManagerCommission);

router.get('/booking/:bookingId', protect, getPaymentByBooking);

module.exports = router;