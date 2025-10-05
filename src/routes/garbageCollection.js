const express = require('express');
const {
    getAllCompanies,
    getCompany,
    updateCompany,
    deleteCompany,
    toggleCompanyStatus,
    verifyCompany,
    getCompanyStats
} = require('../controllers/garbageCompanyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes - customers can browse companies
router.get('/', getAllCompanies);

// IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// Company dashboard stats (must come before /:id to avoid route conflict)
router.get('/dashboard/stats', protect, authorize('garbage_collection_company'), getCompanyStats);

// Protected routes - company owners can update their profile
router.put('/:id', protect, authorize('admin', 'garbage_collection_company'), updateCompany);

// Admin only routes
router.delete('/:id', protect, authorize('admin'), deleteCompany);
router.put('/:id/toggle-status', protect, authorize('admin'), toggleCompanyStatus);
router.put('/:id/verify', protect, authorize('admin'), verifyCompany);

// This MUST be last because :id catches everything
router.get('/:id', getCompany);

module.exports = router;