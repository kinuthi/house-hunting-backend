const express = require('express');
const { register, login, getMe, verifyEmail, resendOTP, approveUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Register route with file upload middleware for ID documents
router.post('/register', upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 }
]), register);

router.post('/login', login);
router.get('/me', protect, getMe);

router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.put('/admin/users/:userId/approve', protect, authorize('admin'), approveUser);

module.exports = router;