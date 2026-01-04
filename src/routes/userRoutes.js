const express = require('express');
const router = express.Router();
const { createStaff, getStaff, deleteStaff, updateStaff, checkUsernameAvailability } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin'), createStaff)
    .get(protect, authorize('admin'), getStaff);

router.route('/check-username/:username')
    .get(protect, authorize('admin'), checkUsernameAvailability);

router.route('/:id')
    .put(protect, authorize('admin'), updateStaff)
    .delete(protect, authorize('admin'), deleteStaff);

module.exports = router;
