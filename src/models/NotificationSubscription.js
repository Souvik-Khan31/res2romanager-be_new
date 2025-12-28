const mongoose = require('mongoose');

const notificationSubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    subscription: {
        endpoint: {
            type: String,
            required: true
        },
        keys: {
            p256dh: {
                type: String,
                required: true
            },
            auth: {
                type: String,
                required: true
            }
        }
    },
    deviceType: {
        type: String, // 'mobile', 'desktop'
        default: 'mobile'
    }
}, { timestamps: true });

// Ensure one entry per endpoint per user to avoid duplicates
notificationSubscriptionSchema.index({ user: 1, 'subscription.endpoint': 1 }, { unique: true });

module.exports = mongoose.model('NotificationSubscription', notificationSubscriptionSchema);
