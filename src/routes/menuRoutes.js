const express = require('express');
const router = express.Router();
const {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadCoverImage,
    getRestaurantInfo,
    bulkImportMenuItems
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadMenuItem, uploadCoverImage: uploadCoverImageMiddleware } = require('../middleware/uploadMiddleware');

// Upload middleware is now imported from uploadMiddleware.js with specific size limits:
// - uploadMenuItem: 100 KB limit for menu item images
// - uploadCoverImageMiddleware: 250 KB limit for cover images

// Restaurant Info
router.route('/restaurant-info')
    .get(getRestaurantInfo);

// Cover Image Upload (250 KB limit, auto-convert to WebP handled by Cloudinary)
router.route('/cover-image')
    .post(protect, authorize('admin'), uploadCoverImageMiddleware.single('coverImage'), uploadCoverImage);

// Categories
router.route('/categories')
    .get(getCategories) // Public/Private
    .post(protect, authorize('admin'), createCategory);

router.route('/categories/:id')
    .put(protect, authorize('admin'), updateCategory)
    .delete(protect, authorize('admin'), deleteCategory);

// Items (100 KB limit for menu item images, auto-convert to WebP handled by Cloudinary)
router.route('/items')
    .get(getMenuItems)
    .post(protect, authorize('admin'), uploadMenuItem.single('image'), createMenuItem);

router.route('/items/:id')
    .put(protect, authorize('admin'), uploadMenuItem.single('image'), updateMenuItem)
    .delete(protect, authorize('admin'), deleteMenuItem);

// Bulk Import
router.route('/bulk-import')
    .post(protect, authorize('super-admin'), bulkImportMenuItems);

module.exports = router;
