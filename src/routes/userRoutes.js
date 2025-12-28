const express = require('express');
const router = express.Router();
const { createStaff, getStaff, deleteStaff } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin'), createStaff)
    .get(protect, authorize('admin'), getStaff);

router.route('/:id')
    .delete(protect, authorize('admin'), deleteStaff);

module.exports = router;
