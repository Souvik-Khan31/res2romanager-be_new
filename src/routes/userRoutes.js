const express = require('express');
const router = express.Router();
const { createStaff, getStaff, deleteStaff, updateStaff, checkUsernameAvailability, getCustomers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin'), createStaff)
    .get(protect, authorize('admin'), getStaff);

router.route('/check-username/:username')
    .get(protect, authorize('admin'), checkUsernameAvailability);

router.route('/customers')
    .get(protect, authorize('admin', 'super-admin'), getCustomers);

router.route('/:id')
    .put(protect, authorize('admin'), updateStaff)
    .delete(protect, authorize('admin'), deleteStaff);

module.exports = router;
