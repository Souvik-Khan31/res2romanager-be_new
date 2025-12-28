const express = require('express');
const router = express.Router();
const { registerRestaurant, loginUser, getProfile, registerCustomer, googleLogin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register-restaurant', registerRestaurant);
router.post('/register-customer', registerCustomer);
router.post('/login', loginUser);
router.post('/google-login', googleLogin);
router.get('/profile', protect, getProfile);

module.exports = router;
