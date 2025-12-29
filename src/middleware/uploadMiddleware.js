const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const Restaurant = require('../models/Restaurant');

// Helper to sanitize strings for filenames
const sanitize = (str) => {
    if (!str) return '';
    // Replace spaces with underscores, remove special chars, toLowerCase
    return str.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
};

const getRandom = () => Math.floor(1000 + Math.random() * 9000);

// Helper to fetch restaurant name
const getRestaurantName = async (req) => {
    try {
        let restaurantId = null;
        if (req.user && req.user.restaurantId) {
            restaurantId = req.user.restaurantId;
        } else if (req.params && req.params.id) {
            restaurantId = req.params.id;
        }

        if (restaurantId) {
            const restaurant = await Restaurant.findById(restaurantId).select('name');
            if (restaurant) return sanitize(restaurant.name);
        }
    } catch (error) {
        console.error('Error fetching restaurant name for upload:', error);
    }
    return ''; // Return empty to trigger fallback
};

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Default transformations
        let transformation = [{ quality: 'auto:good' }];

        // Specific resizing based on field name
        if (file.fieldname === 'image') {
            transformation.push({ width: 300, height: 300, crop: 'limit' });
        } else if (file.fieldname === 'coverImage') {
            transformation.push({ width: 768, crop: 'limit' });
        } else if (file.fieldname === 'qrImage') {
            transformation.push({ width: 512, height: 512, crop: 'limit' });
        }

        // 1. Website Name (from Env or default)
        const websiteName = sanitize(process.env.PRODUCT_NAME) || 'RestoManager';

        // 2. Restaurant Name (from DB or random)
        const dbRestName = await getRestaurantName(req);
        const restaurantName = dbRestName || `Rest_${getRandom()}`;

        // 3. Product Name (from req.body or fieldname or random)
        let productName = '';
        if (file.fieldname === 'image') {
            // For menu items, try to get name from body
            const bodyName = sanitize(req.body.name);
            productName = bodyName || `Item_${getRandom()}`;
        } else if (file.fieldname === 'coverImage') {
            productName = 'Cover_Image';
        } else if (file.fieldname === 'qrImage') {
            productName = 'QR_Code';
        } else {
            const origName = sanitize(path.parse(file.originalname).name);
            productName = origName || `File_${getRandom()}`;
        }

        // Construct final public_id
        // Ensure NO TRAILING SPACES
        // Cloudinary handles uniqueness if we don't return a fixed string, 
        // but here we want a specific name. We explicitly add timestamp to ensure uniqueness 
        // if user uploads same item name multiple times.
        const finalName = `${websiteName}_${restaurantName}_${productName}_${Date.now()}`;

        return {
            folder: 'restaurant-app-uploads',
            format: 'webp',
            public_id: finalName,
            transformation: transformation
        };
    },
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'image/webp';

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only! Allowed formats: JPEG, JPG, PNG, GIF, WebP');
    }
}

// Create upload middleware with configurable size limit
// Input: 5MB max, processed by Cloudinary
const createUpload = (sizeLimit = 5 * 1024 * 1024) => {
    return multer({
        storage: storage,
        limits: { fileSize: sizeLimit },
        fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        }
    });
};

// Export different upload configurations
module.exports = {
    // Default upload
    upload: createUpload(),

    // Menu item upload
    uploadMenuItem: createUpload(),

    // Cover image upload
    uploadCoverImage: createUpload(),

    // QR image upload
    uploadQRImage: createUpload(),

    // Custom size upload
    createUpload,

    // Export cloudinary instance
    cloudinary
};
