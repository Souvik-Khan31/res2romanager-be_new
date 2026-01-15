const express = require('express');
const router = express.Router();
const { placeOrder, getOrders, updateOrderStatus, getOrderById, updateCourseStatus, submitRating } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', placeOrder); // Public
router.post('/staff', protect, placeOrder); // Protected (Staff/Admin)
router.get('/my-orders', protect, require('../controllers/orderController').getMyOrders); // Custom History
router.get('/:id', getOrderById); // Public Tracking
router.get('/', protect, getOrders);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/course/:courseType/status', protect, updateCourseStatus);
router.post('/:orderId/pay', protect, require('../controllers/orderController').markOrderAsPaid);
router.put('/:id/rate', submitRating); // Public for customers to rate via order tracking link

module.exports = router;
