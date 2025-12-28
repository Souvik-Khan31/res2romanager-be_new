const express = require('express');
const router = express.Router();
const { getTables, createTable, deleteTable } = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getTables)
    .post(protect, authorize('admin'), createTable);

router.route('/:id')
    .delete(protect, authorize('admin'), deleteTable);

module.exports = router;
