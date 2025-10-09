const express = require('express');
const {
    createContact,
    getAllContacts,
    getContact,
    updateContactStatus,
    deleteContact,
    getUnreadCount,
    getContactsByStatus
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public route - anyone can submit contact form
router.route('/')
    .post(createContact)
    .get(protect, authorize('admin'), getAllContacts);

// Admin only routes
router.route('/unread-count')
    .get(protect, authorize('admin'), getUnreadCount);

router.route('/status/:status')
    .get(protect, authorize('admin'), getContactsByStatus);

router.route('/:id')
    .get(protect, authorize('admin'), getContact)
    .delete(protect, authorize('admin'), deleteContact);

router.route('/:id/status')
    .put(protect, authorize('admin'), updateContactStatus);

module.exports = router;