const AWS = require('aws-sdk');
const path = require('path');

// Configure DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
});

const uploadToSpaces = async (file, folder = 'kadi', transformation = {}) => {
    try {
        const fileName = generateFileName(file.originalname, folder);
        const params = {
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: fileName,
            Body: file.buffer,
            ACL: 'public-read',
            ContentType: file.mimetype
        };

        const result = await s3.upload(params).promise();

        return {
            success: true,
            data: {
                public_id: fileName,
                url: result.Location,
                key: result.Key,
                format: path.extname(file.originalname).substring(1),
                size: file.size
            }
        };
    } catch (error) {
        console.error('DigitalOcean Spaces upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const deleteFromSpaces = async (key) => {
    try {
        const params = {
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: key
        };

        await s3.deleteObject(params).promise();

        return {
            success: true,
            data: { message: 'File deleted successfully' }
        };
    } catch (error) {
        console.error('DigitalOcean Spaces delete error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const uploadMultipleToSpaces = async (files, folder = 'kadi', transformation = {}) => {
    try {
        const uploadPromises = files.map(file => uploadToSpaces(file, folder, transformation));
        const results = await Promise.all(uploadPromises);

        const successfulUploads = results.filter(result => result.success);
        const failedUploads = results.filter(result => !result.success);

        return {
            success: failedUploads.length === 0,
            data: successfulUploads.map(result => result.data),
            errors: failedUploads.map(result => result.error)
        };
    } catch (error) {
        console.error('Multiple upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const getImageTransformations = (type) => {
    // Note: DigitalOcean Spaces doesn't handle transformations like Cloudinary
    // You'll need to handle image transformations on upload or use a separate service
    const transformations = {
        avatar: {
            width: 200,
            height: 200,
            crop: 'thumb'
        },
        campaign_main: {
            width: 800,
            height: 600,
            crop: 'limit'
        },
        campaign_gallery: {
            width: 600,
            height: 400,
            crop: 'limit'
        },
        thumbnail: {
            width: 300,
            height: 200,
            crop: 'fill'
        }
    };

    return transformations[type] || transformations.campaign_main;
};

const validateFileType = (file, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']) => {
    return allowedTypes.includes(file.mimetype);
};

const validateFileSize = (file, maxSizeInMB = 5) => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
};

const generateFileName = (originalName, prefix = '') => {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);

    return `${prefix}/${name}_${timestamp}_${random}${ext}`;
};

const getFileUrl = (key) => {
    return `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${key}`;
};

const listFiles = async (folder = '', maxKeys = 1000) => {
    try {
        const params = {
            Bucket: process.env.DO_SPACES_BUCKET,
            Prefix: folder,
            MaxKeys: maxKeys
        };

        const result = await s3.listObjectsV2(params).promise();

        return {
            success: true,
            data: result.Contents.map(item => ({
                key: item.Key,
                size: item.Size,
                lastModified: item.LastModified,
                url: getFileUrl(item.Key)
            }))
        };
    } catch (error) {
        console.error('DigitalOcean Spaces list error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

const checkFileExists = async (key) => {
    try {
        const params = {
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: key
        };

        await s3.headObject(params).promise();
        return { success: true, exists: true };
    } catch (error) {
        if (error.code === 'NotFound') {
            return { success: true, exists: false };
        }
        return { success: false, error: error.message };
    }
};

module.exports = {
    uploadToSpaces,
    deleteFromSpaces,
    uploadMultipleToSpaces,
    getImageTransformations,
    validateFileType,
    validateFileSize,
    generateFileName,
    getFileUrl,
    listFiles,
    checkFileExists,
    s3 // Export s3 client for advanced usage
};