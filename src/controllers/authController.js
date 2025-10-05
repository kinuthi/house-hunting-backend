const User = require('../models/User');
const GarbageCollectionCompany = require('../models/GarbageCollectionCompany');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

exports.register = async (req, res) => {
    try {
        console.log('Registration request body:', req.body); // Add this line to debug

        const { name, email, password, phone, role, garbageCollectionData } = req.body;

        console.log('Extracted values:', { name, email, password, phone, role }); // Add this too

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const allowedRoles = ['customer', 'property_manager', 'garbage_collection_company'];
        const userRole = allowedRoles.includes(role) ? role : 'customer';

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: userRole
        });

        // If registering as garbage collection company, create their profile
        if (userRole === 'garbage_collection_company') {
            if (!garbageCollectionData) {
                await user.deleteOne();
                return res.status(400).json({
                    success: false,
                    message: 'Garbage collection company data is required'
                });
            }

            const garbageCompany = await GarbageCollectionCompany.create({
                ...garbageCollectionData,
                email: user.email,
                phone: user.phone
            });

            user.garbageCollectionProfile = garbageCompany._id;
            await user.save();
        }

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                garbageCollectionProfile: user.garbageCollectionProfile
            }
        });
    } catch (error) {
        console.error('Registration error:', error); // Add this
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email })
            .select('+password')
            .populate('garbageCollectionProfile');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                garbageCollectionProfile: user.garbageCollectionProfile
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('garbageCollectionProfile');
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};