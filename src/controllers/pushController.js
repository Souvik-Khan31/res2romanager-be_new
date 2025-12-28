const NotificationSubscription = require('../models/NotificationSubscription');

// @desc    Save/Register Push Subscription
// @route   POST /api/push/subscribe
// @access  Private
const subscribe = async (req, res) => {
    try {
        const { subscription, deviceType } = req.body;
        console.log(`Received subscription attempt for user ${req.user._id}, device: ${deviceType}`);

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ message: 'Invalid subscription object' });
        }

        // Upsert subscription
        await NotificationSubscription.findOneAndUpdate(
            { user: req.user._id, 'subscription.endpoint': subscription.endpoint },
            {
                user: req.user._id,
                restaurantId: req.user.restaurantId,
                subscription,
                deviceType: deviceType || 'mobile'
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: 'Subscription saved successfully' });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unsubscribe / Remove Push Subscription
// @route   POST /api/push/unsubscribe
// @access  Private
const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.status(400).json({ message: 'Endpoint required' });
        }

        await NotificationSubscription.deleteOne({
            user: req.user._id,
            'subscription.endpoint': endpoint
        });

        res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get VAPID Public Key
// @route   GET /api/push/key
// @access  Public
const getPublicKey = async (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

module.exports = { subscribe, unsubscribe, getPublicKey };
