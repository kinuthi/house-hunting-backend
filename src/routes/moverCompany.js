const express = require('express');
const {
    getAllCompanies,
    getCompany,
    updateCompany,
    deleteCompany,
    toggleCompanyStatus,
    verifyCompany,
    getCompanyStats
} = require('../controllers/moverCompanyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.route('/')
    .get(getAllCompanies);

router.route('/:id')
    .get(getCompany);

// Protected routes
router.route('/:id/update')
    .put(protect, authorize('admin', 'mover_company'), updateCompany);

router.route('/:id/delete')
    .delete(protect, authorize('admin'), deleteCompany);

router.route('/:id/toggle-status')
    .put(protect, authorize('admin'), toggleCompanyStatus);

router.route('/:id/verify')
    .put(protect, authorize('admin'), verifyCompany);

router.route('/stats/dashboard')
    .get(protect, authorize('mover_company'), getCompanyStats);

module.exports = router;