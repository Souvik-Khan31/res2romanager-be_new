const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getAllRestaurants,
    updateSubscription,
    toggleBlockRestaurant
} = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes here are protected and require super-admin role
router.use(protect);
router.use(authorize('super-admin'));

router.get('/stats', getDashboardStats);
router.get('/restaurants', getAllRestaurants);
router.patch('/restaurants/:id/toggle-block', toggleBlockRestaurant);
router.put('/restaurants/:id/subscription', updateSubscription);

module.exports = router;
