const User = require('../models/User');
const GarbageCollectionCompany = require('../models/GarbageCollectionCompany');
const emailService = require('../services/email');
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

        const { name, email, password, phone, role, idNumber, idType } = req.body;

        // Parse garbageCollectionData if it exists (comes as string from FormData)
        let garbageCollectionData = null;
        if (req.body.garbageCollectionData) {
            try {
                garbageCollectionData = JSON.parse(req.body.garbageCollectionData);
            } catch (e) {
                console.error('Error parsing garbageCollectionData:', e);
            }
        }

        console.log('Extracted values:', { name, email, password, phone, role });

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const allowedRoles = ['customer', 'property_manager', 'garbage_collection_company'];
        const userRole = allowedRoles.includes(role) ? role : 'customer';

        // Validate ID documents for property managers and garbage collection companies
        if (userRole === 'property_manager' || userRole === 'garbage_collection_company') {
            if (!req.files || !req.files.idFront || !req.files.idBack) {
                return res.status(400).json({
                    success: false,
                    message: 'ID document front and back images are required for verification'
                });
            }

            if (!idNumber || !idType) {
                return res.status(400).json({
                    success: false,
                    message: 'ID number and ID type are required'
                });
            }
        }

        // Upload ID documents if required
        let idDocumentData = null;
        if (userRole === 'property_manager' || userRole === 'garbage_collection_company') {
            try {
                const idFrontFile = req.files.idFront[0];
                const idBackFile = req.files.idBack[0];

                console.log('Uploading ID front...');
                // Upload front ID
                const idFrontResult = await uploadToSpaces(
                    idFrontFile,
                    'id-documents'
                );

                if (!idFrontResult.success) {
                    throw new Error('Failed to upload ID front: ' + idFrontResult.error);
                }

                console.log('ID front uploaded:', idFrontResult.data.url);

                console.log('Uploading ID back...');
                // Upload back ID
                const idBackResult = await uploadToSpaces(
                    idBackFile,
                    'id-documents'
                );

                if (!idBackResult.success) {
                    // Clean up front ID if back upload fails
                    await deleteFromSpaces(idFrontResult.data.key);
                    throw new Error('Failed to upload ID back: ' + idBackResult.error);
                }

                console.log('ID back uploaded:', idBackResult.data.url);

                // Extract only the URL strings from the upload results
                idDocumentData = {
                    front: idFrontResult.data.url,      // Extract just the URL string
                    back: idBackResult.data.url,         // Extract just the URL string
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
            email,
            password,
            phone,
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

        // Generate OTP for email verification
        const otp = user.generateEmailVerificationOTP();
        await user.save({ validateBeforeSave: false });

        console.log('OTP generated for user:', user.email);

        // If registering as garbage collection company, create their profile
        if (userRole === 'garbage_collection_company') {
            if (!garbageCollectionData) {
                // Clean up uploaded documents
                if (idDocumentData) {
                    try {
                        // Extract key from URL for deletion
                        const frontKey = idDocumentData.front.split('.com/')[1];
                        const backKey = idDocumentData.back.split('.com/')[1];
                        await deleteFromSpaces(frontKey);
                        await deleteFromSpaces(backKey);
                    } catch (deleteError) {
                        console.error('Error deleting uploaded files:', deleteError);
                    }
                }
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
            await user.save({ validateBeforeSave: false });

            console.log('Garbage collection company profile created:', garbageCompany._id);
        }

        // Send OTP verification email
        try {
            await emailService.sendEmailVerificationOTP(user.email, {
                name: user.name,
                otp: otp
            });
            console.log('OTP email sent to:', user.email);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Don't fail registration if email fails
        }

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(user.email, {
                name: user.name,
                role: user.role,
                requiresApproval: userRole === 'property_manager' || userRole === 'garbage_collection_company'
            });
            console.log('Welcome email sent to:', user.email);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        // Don't generate token yet - user needs to verify email first
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for verification code.',
            data: {
                userId: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                approvalStatus: user.approvalStatus,
                requiresApproval: userRole === 'property_manager' || userRole === 'garbage_collection_company'
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and OTP'
            });
        }

        // Find user and include OTP fields
        const user = await User.findOne({ email })
            .select('+emailVerificationOTP +emailVerificationOTPExpires')
            .populate('garbageCollectionProfile');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Verify OTP
        const isValidOTP = await user.verifyEmailOTP(otp);

        if (!isValidOTP) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Mark email as verified
        user.isEmailVerified = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationOTPExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // Generate token now that email is verified
        const token = generateToken(user._id);

        // Send notification to admin if user is property manager or garbage collection company
        if (user.role === 'property_manager' || user.role === 'garbage_collection_company') {
            try {
                await emailService.sendNewUserApprovalNotificationToAdmin({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    idDocument: user.idDocument
                });
                console.log('Admin notification sent for user approval:', user.email);
            } catch (emailError) {
                console.error('Failed to send admin notification:', emailError);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                approvalStatus: user.approvalStatus,
                garbageCollectionProfile: user.garbageCollectionProfile
            }
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new OTP
        const otp = user.generateEmailVerificationOTP();
        await user.save({ validateBeforeSave: false });

        // Send OTP email
        try {
            await emailService.sendEmailVerificationOTP(user.email, {
                name: user.name,
                otp: otp
            });
            console.log('OTP resent to:', user.email);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
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

        if (!user.isEmailVerified) {
            return res.status(401).json({
                success: false,
                message: 'Please verify your email before logging in',
                requiresVerification: true
            });
        }

        // Check approval status for property managers and garbage collection companies
        if ((user.role === 'property_manager' || user.role === 'garbage_collection_company')
            && user.approvalStatus === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval. You will be notified once approved.',
                approvalStatus: 'pending'
            });
        }

        if ((user.role === 'property_manager' || user.role === 'garbage_collection_company')
            && user.approvalStatus === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Your account registration was rejected. Please contact support for more information.',
                approvalStatus: 'rejected',
                approvalNotes: user.approvalNotes
            });
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
                isEmailVerified: user.isEmailVerified,
                approvalStatus: user.approvalStatus,
                garbageCollectionProfile: user.garbageCollectionProfile
            }
        });
    } catch (error) {
        console.error('Login error:', error);
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

// Admin: Approve user (property manager or garbage collection company)
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

        if (user.role !== 'property_manager' && user.role !== 'garbage_collection_company') {
            return res.status(400).json({
                success: false,
                message: 'This user does not require approval'
            });
        }

        user.approvalStatus = approvalStatus;
        user.approvalNotes = approvalNotes;
        user.approvedAt = Date.now();
        user.approvedBy = req.user.id;

        // Verify ID document if approved
        if (approvalStatus === 'approved') {
            user.idDocument.isVerified = true;
            user.idDocument.verifiedAt = Date.now();
            user.idDocument.verifiedBy = req.user.id;
        }

        await user.save();

        // Send approval/rejection email
        try {
            await emailService.sendUserApprovalNotification(user.email, {
                name: user.name,
                approvalStatus: approvalStatus,
                approvalNotes: approvalNotes,
                role: user.role
            });
            console.log(`Approval notification (${approvalStatus}) sent to:`, user.email);
        } catch (emailError) {
            console.error('Failed to send approval notification:', emailError);
        }

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