const express = require('express');
const router = express.Router();
const { getBill, processPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/:id/bill', protect, getBill);
router.post('/:id/pay', protect, processPayment);

module.exports = router;
