const express = require('express');
const router = express.Router();
const { uploadQRImage, uploadOfferAd } = require('../middleware/uploadMiddleware');
const { getRestaurant, updateRestaurantSettings, uploadQrImage, getPublicSettings, getRestaurantRatings, uploadOfferAdImage } = require('../controllers/restaurantController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:id', getRestaurant);
router.get('/:id/public-settings', getPublicSettings); // Public route
router.get('/:id/ratings', getRestaurantRatings); // Public reviews
router.put('/:id/settings', protect, updateRestaurantSettings);
router.post('/:id/upload-qr', protect, uploadQRImage.single('qrImage'), uploadQrImage);
router.post('/:id/upload-offer-ad', protect, uploadOfferAd.single('offerAd'), uploadOfferAdImage);

module.exports = router;
