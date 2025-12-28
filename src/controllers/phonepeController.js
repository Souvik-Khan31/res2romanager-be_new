const Order = require('../models/Order');
const phonepeService = require('../services/phonepeService');
const { getIo } = require('../../socket');

const initiate = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Use totalAmount from order. Amount in PhonePe is in paise (totalAmount * 100)
        // But our service already handles the * 100
        const result = await phonepeService.initiatePayment(
            order.totalAmount,
            order._id.toString(),
            order.user ? order.user.toString() : null
        );

        if (result.success) {
            // Store transaction ID in order for tracking
            order.phonepeTransactionId = result.merchantTransactionId;
            order.phonepePaymentStatus = 'PENDING';
            await order.save();

            res.json({
                success: true,
                redirectUrl: result.data.instrumentResponse.redirectInfo.url
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to initiate payment with PhonePe',
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const checkStatus = async (req, res) => {
    try {
        const { merchantTransactionId } = req.params;
        const result = await phonepeService.verifyPaymentStatus(merchantTransactionId);

        if (result.success && result.data.code === 'PAYMENT_SUCCESS') {
            const order = await Order.findOne({ phonepeTransactionId: merchantTransactionId });
            if (order && order.paymentStatus !== 'paid') {
                order.paymentStatus = 'paid';
                order.paymentMode = 'upi';
                order.phonepePaymentStatus = 'COMPLETED';

                // Move from pending-payment to placed if applicable
                if (order.status === 'pending-payment') {
                    order.status = 'placed';
                }

                order.timeline.push({
                    status: 'paid',
                    timestamp: new Date(),
                    user: 'PhonePe'
                });
                await order.save();

                // Notify Kitchen/Waiters via Socket
                const io = getIo();
                io.to(order.restaurantId.toString()).emit('orderUpdate', order);
            }
            res.json({ success: true, status: 'COMPLETED', order });
        } else {
            res.json({
                success: false,
                status: result.data ? result.data.code : 'FAILED',
                message: result.error || 'Payment failed or pending'
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const handleWebhook = async (req, res) => {
    // PhonePe sends server-to-server notification
    // For now we just acknowledge, but in production we should verify checksum
    console.log('PhonePe Webhook Received:', req.body);
    res.status(200).send('OK');
};

module.exports = {
    initiate,
    checkStatus,
    handleWebhook
};
