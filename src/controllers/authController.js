const User = require('../models/User');
const GarbageCollectionCompany = require('../models/GarbageCollectionCompany');
const MoverCompany = require('../models/MoverCompany');
const jwt = require('jsonwebtoken');
const { uploadToSpaces, deleteFromSpaces } = require('../services/fileUpload');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

exports.register = async (req, res) => {
    try {
        console.log('Registration request body:', req.body);
        console.log('Files:', req.files);

        const { name, phone, password, role, idNumber, idType } = req.body;

        // Parse garbageCollectionData if it exists (comes as string from FormData)
        let garbageCollectionData = null;
        if (req.body.garbageCollectionData) {
            try {
                garbageCollectionData = JSON.parse(req.body.garbageCollectionData);
            } catch (e) {
                console.error('Error parsing garbageCollectionData:', e);
            }
        }

        // Parse moverCompanyData if it exists (comes as string from FormData)
        let moverCompanyData = null;
        if (req.body.moverCompanyData) {
            try {
                moverCompanyData = JSON.parse(req.body.moverCompanyData);
            } catch (e) {
                console.error('Error parsing moverCompanyData:', e);
            }
        }

        console.log('Extracted values:', { name, phone, password, role });

        // Check if user already exists
        const userExists = await User.findOne({ phone });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }

        const allowedRoles = ['customer', 'property_manager', 'garbage_collection_company', 'mover_company'];
        const userRole = allowedRoles.includes(role) ? role : 'customer';

        // Validate ID documents for property managers and mover companies
        if (userRole === 'property_manager' || userRole === 'mover_company') {
            if (!req.files || !req.files.idFront || !req.files.idBack) {
                return res.status(400).json({
                    success: false,
                    message: `ID document front and back images are required for ${userRole === 'property_manager' ? 'property manager' : 'mover company'} verification`
                });
            }

            if (!idNumber || !idType) {
                return res.status(400).json({
                    success: false,
                    message: `ID number and ID type are required for ${userRole === 'property_manager' ? 'property managers' : 'mover companies'}`
                });
            }
        }

        // Upload ID documents for property managers and mover companies
        let idDocumentData = null;
        if (userRole === 'property_manager' || userRole === 'mover_company') {
            try {
                const idFrontFile = req.files.idFront[0];
                const idBackFile = req.files.idBack[0];

                console.log('Uploading ID front...');
                const idFrontResult = await uploadToSpaces(
                    idFrontFile,
                    'id-documents'
                );

                if (!idFrontResult.success) {
                    throw new Error('Failed to upload ID front: ' + idFrontResult.error);
                }

                console.log('ID front uploaded:', idFrontResult.data.url);

                console.log('Uploading ID back...');
                const idBackResult = await uploadToSpaces(
                    idBackFile,
                    'id-documents'
                );

                if (!idBackResult.success) {
                    await deleteFromSpaces(idFrontResult.data.key);
                    throw new Error('Failed to upload ID back: ' + idBackResult.error);
                }

                console.log('ID back uploaded:', idBackResult.data.url);

                idDocumentData = {
                    front: idFrontResult.data.url,
                    back: idBackResult.data.url,
                    idNumber: idNumber,
                    idType: idType,
                    isVerified: false
                };

                console.log('ID documents uploaded successfully:', idDocumentData);
            } catch (uploadError) {
                console.error('ID document upload error:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload ID documents: ' + uploadError.message
                });
            }
        }

        // Create user data
        const userData = {
            name,
            phone,
            password,
            role: userRole
        };

        // Add ID document data if available
        if (idDocumentData) {
            userData.idDocument = idDocumentData;
        }

        console.log('Creating user with data:', { ...userData, password: '[HIDDEN]' });

        // Create user
        const user = await User.create(userData);

        console.log('User created successfully:', user._id);

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
                phone: user.phone
            });

            user.garbageCollectionProfile = garbageCompany._id;
            await user.save({ validateBeforeSave: false });

            console.log('Garbage collection company profile created:', garbageCompany._id);
        }

        // If registering as mover company, create their profile
        if (userRole === 'mover_company') {
            if (!moverCompanyData) {
                await user.deleteOne();
                return res.status(400).json({
                    success: false,
                    message: 'Mover company data is required'
                });
            }

            const moverCompany = await MoverCompany.create({
                ...moverCompanyData,
                phone: user.phone
            });

            user.moverCompanyProfile = moverCompany._id;
            await user.save({ validateBeforeSave: false });

            console.log('Mover company profile created:', moverCompany._id);
        }

        // Generate token for all users
        const token = generateToken(user._id);

        // Determine appropriate message based on role
        let message = 'Registration successful. You can now login.';
        if (userRole === 'property_manager' || userRole === 'garbage_collection_company' || userRole === 'mover_company') {
            message = 'Registration successful. Your account is pending admin approval.';
        }

        res.status(201).json({
            success: true,
            message: message,
            token: token,
            data: {
                userId: user._id,
                phone: user.phone,
                name: user.name,
                role: user.role,
                approvalStatus: user.approvalStatus,
                requiresApproval: userRole === 'property_manager' || userRole === 'garbage_collection_company' || userRole === 'mover_company'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ success: false, message: 'Please provide phone number and password' });
        }

        const user = await User.findOne({ phone })
            .select('+password')
            .populate('garbageCollectionProfile')
            .populate('moverCompanyProfile');

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Account is deactivated' });
        }

        // Check approval status for property managers
        if (user.role === 'property_manager') {
            if (user.approvalStatus === 'pending') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is pending approval. You will be notified once approved.',
                    approvalStatus: 'pending'
                });
            }

            if (user.approvalStatus === 'rejected') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account registration was rejected. Please contact support for more information.',
                    approvalStatus: 'rejected',
                    approvalNotes: user.approvalNotes
                });
            }
        }

        // Check approval status for garbage collection companies
        if (user.role === 'garbage_collection_company') {
            if (user.approvalStatus === 'pending') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is pending approval. You will be notified once approved.',
                    approvalStatus: 'pending'
                });
            }

            if (user.approvalStatus === 'rejected') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account registration was rejected. Please contact support for more information.',
                    approvalStatus: 'rejected',
                    approvalNotes: user.approvalNotes
                });
            }
        }

        // Check approval status for mover companies
        if (user.role === 'mover_company') {
            if (user.approvalStatus === 'pending') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is pending approval. You will be notified once approved.',
                    approvalStatus: 'pending'
                });
            }

            if (user.approvalStatus === 'rejected') {
                return res.status(403).json({
                    success: false,
                    message: 'Your account registration was rejected. Please contact support for more information.',
                    approvalStatus: 'rejected',
                    approvalNotes: user.approvalNotes
                });
            }
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                approvalStatus: user.approvalStatus,
                garbageCollectionProfile: user.garbageCollectionProfile,
                moverCompanyProfile: user.moverCompanyProfile
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('garbageCollectionProfile')
            .populate('moverCompanyProfile');
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Approve user (property manager, garbage collection company, or mover company)
exports.approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { approvalStatus, approvalNotes } = req.body;

        if (!['approved', 'rejected'].includes(approvalStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid approval status'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.role !== 'property_manager' &&
            user.role !== 'garbage_collection_company' &&
            user.role !== 'mover_company') {
            return res.status(400).json({
                success: false,
                message: 'This user does not require approval'
            });
        }

        user.approvalStatus = approvalStatus;
        user.approvalNotes = approvalNotes;
        user.approvedAt = Date.now();
        user.approvedBy = req.user.id;

        // Verify ID document if approved (for property managers and mover companies who have ID documents)
        if (approvalStatus === 'approved' &&
            (user.role === 'property_manager' || user.role === 'mover_company') &&
            user.idDocument) {
            user.idDocument.isVerified = true;
            user.idDocument.verifiedAt = Date.now();
            user.idDocument.verifiedBy = req.user.id;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${approvalStatus} successfully`,
            data: user
        });
    } catch (error) {
        console.error('User approval error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};