const Order = require('../models/Order');

// @desc    Generate Bill / Get Bill Details
// @route   GET /api/orders/:id/bill
// @access  Private (Staff/Admin)
const getBill = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.menuItemId');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // In a real app, logic for splitting bills, discounts, would go here.
        // For now, we return the order object which already has totals.
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process Payment
// @route   POST /api/orders/:id/pay
// @access  Private (Staff/Admin)
const processPayment = async (req, res) => {
    const { paymentMode, customerPhone, customerName } = req.body; // cash, card, upi, customerPhone, customerName

    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.paymentStatus = 'paid';
        order.paymentMode = paymentMode;
        if (customerPhone) order.customerPhone = customerPhone;
        if (customerName) order.customerName = customerName;
        order.status = 'completed'; // Auto complete order on payment?

        // Add to timeline
        order.timeline.push({
            status: 'paid',
            timestamp: new Date()
        });
        order.timeline.push({
            status: 'completed',
            timestamp: new Date()
        });

        await order.save();

        // Socket emit could happen here via getIo() if we imported it

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBill, processPayment };
