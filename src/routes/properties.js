const express = require('express');
const {
    createProperty,
    getProperties,
    getProperty,
    updateProperty,
    deleteProperty,
    uploadPropertyImages,
    deletePropertyImage
} = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes - anyone can view properties
router.route('/')
    .get(getProperties)
    .post(protect, authorize('admin', 'property_manager'), upload.array('images', 10), createProperty);

router.route('/:id')
    .get(getProperty)
    .put(protect, authorize('admin', 'property_manager'), updateProperty)
    .delete(protect, authorize('admin', 'property_manager'), deleteProperty);

// Protected image management routes
router.post('/:id/images', protect, authorize('admin', 'property_manager'), upload.array('images', 10), uploadPropertyImages);
router.delete('/:id/images', protect, authorize('admin', 'property_manager'), deletePropertyImage);

module.exports = router;