const Property = require('../models/Property');
const {
    uploadToSpaces,
    deleteFromSpaces,
    validateFileType,
    validateFileSize
} = require('../services/fileUpload');

exports.createProperty = async (req, res) => {
    try {
        // Parse address if it's a string
        if (typeof req.body.address === 'string') {
            try {
                req.body.address = JSON.parse(req.body.address);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid address format'
                });
            }
        }

        // Validate required address fields
        if (!req.body.address || !req.body.address.city || !req.body.address.country) {
            return res.status(400).json({
                success: false,
                message: 'Address with city and country is required'
            });
        }

        req.body.propertyManager = req.user.id;
        const property = await Property.create(req.body);

        // Handle image uploads if files are present
        if (req.files && req.files.length > 0) {
            const imagePromises = req.files.map(async (file) => {
                try {
                    // Validate file
                    if (!validateFileType(file)) {
                        throw new Error(`Invalid file type for ${file.originalname}`);
                    }
                    if (!validateFileSize(file, 5)) {
                        throw new Error(`File ${file.originalname} exceeds 5MB limit`);
                    }

                    // Upload to DigitalOcean Spaces
                    const uploadResult = await uploadToSpaces(file, 'properties');

                    if (!uploadResult.success) {
                        throw new Error(uploadResult.error);
                    }

                    return uploadResult.data.url;
                } catch (error) {
                    console.error(`Failed to upload image ${file.originalname}:`, error);
                    return null;
                }
            });

            const processedImages = await Promise.all(imagePromises);
            const validImages = processedImages.filter(img => img !== null);

            if (validImages.length > 0) {
                property.images = validImages;
                await property.save();
            }
        }

        res.status(201).json({ success: true, data: property });
    } catch (error) {
        console.error('Error creating property:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getProperties = async (req, res) => {
    try {
        const { city, propertyType, minPrice, maxPrice, bedrooms, status } = req.query;

        let query = {};

        // Check if user is authenticated
        if (req.user) {
            if (req.user.role === 'property_manager') {
                query.propertyManager = req.user.id;
            } else if (req.user.role === 'customer') {
                query.isPublished = true;
            }
        } else {
            query.isPublished = true;
        }

        // Apply filters
        if (city) query['address.city'] = new RegExp(city, 'i');
        if (propertyType) query.propertyType = propertyType;
        if (bedrooms) query.bedrooms = bedrooms;
        if (status) query.status = status;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = minPrice;
            if (maxPrice) query.price.$lte = maxPrice;
        }

        const properties = await Property.find(query).populate('propertyManager', 'name email phone');
        res.status(200).json({ success: true, count: properties.length, data: properties });
    } catch (error) {
        console.error('Error in getProperties:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('propertyManager', 'name email phone');

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        // Check authorization based on user role
        if (req.user) {
            if (req.user.role === 'customer' && !property.isPublished) {
                return res.status(404).json({ success: false, message: 'Property not found' });
            }

            if (req.user.role === 'property_manager' && property.propertyManager._id.toString() !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        } else {
            if (!property.isPublished) {
                return res.status(404).json({ success: false, message: 'Property not found' });
            }
        }

        res.status(200).json({ success: true, data: property });
    } catch (error) {
        console.error('Error in getProperty:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProperty = async (req, res) => {
    try {
        // Parse address if it's a string
        if (req.body.address && typeof req.body.address === 'string') {
            try {
                req.body.address = JSON.parse(req.body.address);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid address format'
                });
            }
        }

        let property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        if (req.user.role === 'property_manager' && property.propertyManager.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        property = await Property.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: property });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        if (req.user.role === 'property_manager' && property.propertyManager.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Delete images from storage
        if (property.images && property.images.length > 0) {
            const deletePromises = property.images.map(async (imageUrl) => {
                try {
                    const urlParts = imageUrl.split('/');
                    const key = urlParts.slice(3).join('/');
                    await deleteFromSpaces(key);
                } catch (error) {
                    console.error(`Failed to delete image ${imageUrl}:`, error);
                }
            });
            await Promise.all(deletePromises);
        }

        await property.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.uploadPropertyImages = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        if (property.propertyManager.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select images to upload' });
        }

        const validationErrors = [];
        req.files.forEach((file, index) => {
            if (!validateFileType(file)) {
                validationErrors.push(`File ${index + 1}: Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.`);
            }
            if (!validateFileSize(file, 5)) {
                validationErrors.push(`File ${index + 1}: File size exceeds 5MB limit.`);
            }
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({ success: false, errors: validationErrors });
        }

        const imagePromises = req.files.map(async (file) => {
            try {
                const uploadResult = await uploadToSpaces(file, 'properties');

                if (!uploadResult.success) {
                    throw new Error(uploadResult.error);
                }

                return uploadResult.data.url;
            } catch (error) {
                console.error(`Failed to upload image ${file.originalname}:`, error);
                throw error;
            }
        });

        const uploadedImages = await Promise.all(imagePromises);
        property.images.push(...uploadedImages);
        await property.save();

        res.status(200).json({
            success: true,
            message: `${req.files.length} images uploaded successfully`,
            data: property.images
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deletePropertyImage = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        if (property.propertyManager.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Image URL is required' });
        }

        const imageIndex = property.images.findIndex(img => img === imageUrl);

        if (imageIndex === -1) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        try {
            const urlParts = imageUrl.split('/');
            const key = urlParts.slice(3).join('/');
            await deleteFromSpaces(key);
        } catch (error) {
            console.error('Failed to delete image from storage:', error);
        }

        property.images.splice(imageIndex, 1);
        await property.save();

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully',
            data: property
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};