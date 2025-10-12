const express = require('express');
const router = express.Router();
const { register, login, getMe, approveUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/register', upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 }
]), register);

router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);

// Admin routes - both paths supported
router.put('/approve/:userId', protect, authorize('admin'), approveUser);
router.put('/admin/users/:userId/approve', protect, authorize('admin'), approveUser);

module.exports = router;