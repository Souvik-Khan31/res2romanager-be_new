const express = require('express');
const router = express.Router();
const { getDashboardStats, getReports } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, authorize('admin'), getDashboardStats);
router.get('/reports', protect, authorize('admin'), getReports);

module.exports = router;
