const Settings = require('../models/Settings');

// Get global settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ settingType: 'global' });

        // Create default settings if none exist
        if (!settings) {
            settings = await Settings.create({
                downPaymentPercentage: 20,
                managerCommissionEnabled: false,
                managerCommissionPercentage: 5,
                settingType: 'global'
            });
        }

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update settings (Admin only)
exports.updateSettings = async (req, res) => {
    try {
        const { downPaymentPercentage, managerCommissionEnabled, managerCommissionPercentage } = req.body;

        let settings = await Settings.findOne({ settingType: 'global' });

        if (!settings) {
            // Create if doesn't exist
            settings = await Settings.create({
                downPaymentPercentage,
                managerCommissionEnabled,
                managerCommissionPercentage,
                settingType: 'global'
            });
        } else {
            // Update existing
            if (downPaymentPercentage !== undefined) {
                settings.downPaymentPercentage = downPaymentPercentage;
            }
            if (managerCommissionEnabled !== undefined) {
                settings.managerCommissionEnabled = managerCommissionEnabled;
            }
            if (managerCommissionPercentage !== undefined) {
                settings.managerCommissionPercentage = managerCommissionPercentage;
            }

            await settings.save();
        }

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};