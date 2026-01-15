const NotificationSubscription = require('../models/NotificationSubscription');

// @desc    Save/Register Push Subscription
// @route   POST /api/push/subscribe
// @access  Private
const subscribe = async (req, res) => {
    try {
        const { subscription, deviceType, fcmToken } = req.body;
        console.log(`Received subscription attempt for user ${req.user._id}, device: ${deviceType}, hasFcm: ${!!fcmToken}`);

        if (!fcmToken && (!subscription || !subscription.endpoint || !subscription.keys)) {
            return res.status(400).json({ message: 'Invalid subscription or FCM token' });
        }

        // Upsert subscription
        // If fcmToken is provided, we use it as the unique identifier for mobile devices
        const query = fcmToken
            ? { user: req.user._id, fcmToken: fcmToken }
            : { user: req.user._id, 'subscription.endpoint': subscription.endpoint };

        await NotificationSubscription.findOneAndUpdate(
            query,
            {
                user: req.user._id,
                restaurantId: req.user.restaurantId,
                subscription,
                fcmToken,
                deviceType: deviceType || (fcmToken ? 'mobile' : 'desktop')
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
