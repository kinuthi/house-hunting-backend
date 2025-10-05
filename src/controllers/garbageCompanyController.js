const GarbageCollectionCompany = require('../models/GarbageCollectionCompany');
const User = require('../models/User');

// Get all garbage collection companies (public - for customers to browse)
exports.getAllCompanies = async (req, res) => {
    try {
        const { city, state, serviceType, isVerified } = req.query;
        let query = { isActive: true };

        // Apply filters
        if (city) query['address.city'] = new RegExp(city, 'i');
        if (state) query['address.state'] = new RegExp(state, 'i');
        if (serviceType) query.servicesOffered = serviceType;
        if (isVerified !== undefined) query.isVerified = isVerified === 'true';

        const companies = await GarbageCollectionCompany.find(query)
            .select('-bankDetails -documents')
            .sort('-rating.average');

        res.status(200).json({ success: true, count: companies.length, data: companies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single company details
exports.getCompany = async (req, res) => {
    try {
        let selectFields = '-bankDetails -documents';

        // If admin or the company itself, show all details
        if (req.user && (req.user.role === 'admin' || req.user.role === 'garbage_collection_company')) {
            const user = await User.findById(req.user.id);
            if (req.user.role === 'admin' ||
                (user.garbageCollectionProfile && user.garbageCollectionProfile.toString() === req.params.id)) {
                selectFields = ''; // Show all fields
            }
        }

        const company = await GarbageCollectionCompany.findById(req.params.id).select(selectFields);

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        res.status(200).json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update company profile (only company owner or admin)
exports.updateCompany = async (req, res) => {
    try {
        let company = await GarbageCollectionCompany.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin') {
            const user = await User.findById(req.user.id);
            if (!user.garbageCollectionProfile ||
                user.garbageCollectionProfile.toString() !== req.params.id) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        // Prevent companies from changing their own verification status
        if (req.user.role !== 'admin') {
            delete req.body.isVerified;
            delete req.body.platformCommissionPercentage;
        }

        company = await GarbageCollectionCompany.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete company (admin only)
exports.deleteCompany = async (req, res) => {
    try {
        const company = await GarbageCollectionCompany.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // Find and delete associated user account
        const user = await User.findOne({ garbageCollectionProfile: req.params.id });
        if (user) {
            await user.deleteOne();
        }

        await company.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle company active status (admin only)
exports.toggleCompanyStatus = async (req, res) => {
    try {
        const company = await GarbageCollectionCompany.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        company.isActive = !company.isActive;
        await company.save();

        // Update associated user account status
        await User.updateOne(
            { garbageCollectionProfile: req.params.id },
            { isActive: company.isActive }
        );

        res.status(200).json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify company (admin only)
exports.verifyCompany = async (req, res) => {
    try {
        const company = await GarbageCollectionCompany.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        company.isVerified = true;
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Company verified successfully',
            data: company
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get company dashboard stats (for company owners)
exports.getCompanyStats = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user.garbageCollectionProfile) {
            return res.status(403).json({ success: false, message: 'No company profile found' });
        }

        const companyId = user.garbageCollectionProfile;

        // Import models needed for stats
        const GarbageCollectionBooking = require('../models/GarbageCollectionBooking');
        const Payment = require('../models/Payment');

        // Get booking statistics
        const totalBookings = await GarbageCollectionBooking.countDocuments({
            garbageCollectionCompany: companyId
        });

        const completedBookings = await GarbageCollectionBooking.countDocuments({
            garbageCollectionCompany: companyId,
            status: 'completed'
        });

        const pendingBookings = await GarbageCollectionBooking.countDocuments({
            garbageCollectionCompany: companyId,
            status: 'pending'
        });

        // Get payment statistics
        const payments = await Payment.find({
            garbageCollectionCompany: companyId,
            paymentType: 'garbage_collection',
            paymentStatus: 'paid'
        });

        const totalRevenue = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);
        const totalEarnings = payments.reduce((sum, payment) => sum + payment.companyEarnings, 0);
        const platformCommission = payments.reduce((sum, payment) => sum + payment.platformCommission.amount, 0);

        const paidCommissions = payments.filter(p => p.commissionPaidToCompany).length;
        const pendingCommissions = payments.filter(p => !p.commissionPaidToCompany).length;

        res.status(200).json({
            success: true,
            data: {
                bookings: {
                    total: totalBookings,
                    completed: completedBookings,
                    pending: pendingBookings
                },
                revenue: {
                    totalRevenue,
                    totalEarnings,
                    platformCommission,
                    paidCommissions,
                    pendingCommissions
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};