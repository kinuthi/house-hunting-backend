const Settings = require('../models/Settings');

// Get global settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ settingType: 'global' });

        // Create default settings if none exist
        if (!settings) {
            settings = await Settings.create({
                settingType: 'global',
                garbageCollectionCommissionPercentage: 20
            });
        }

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update settings (admin only)
exports.updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ settingType: 'global' });

        if (!settings) {
            // Create settings if they don't exist
            settings = await Settings.create({
                ...req.body,
                settingType: 'global'
            });
        } else {
            // Update existing settings
            settings = await Settings.findOneAndUpdate(
                { settingType: 'global' },
                req.body,
                { new: true, runValidators: true }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};