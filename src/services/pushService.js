const webpush = require('web-push');
const NotificationSubscription = require('../models/NotificationSubscription');

// Configure VAPID
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@restaurant.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

/**
 * Send push notification to all subscriptions of a specific restaurant and optionally specific roles/users
 */
const sendPushNotification = async (restaurantId, { title, body, icon, data, url }) => {
    try {
        console.log(`Sending push notification: "${title}" for restaurant ${restaurantId}`);
        // Find all active subscriptions for this restaurant
        // Currently we send to all waiters/admins of the restaurant
        const subscriptions = await NotificationSubscription.find({ restaurantId });

        const payload = JSON.stringify({
            notification: {
                title,
                body,
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
                data: {
                    url: url || '/',
                    ...data
                }
            }
        });

        const sendPromises = subscriptions.map(async (subDoc) => {
            try {
                await webpush.sendNotification(subDoc.subscription, payload);
            } catch (error) {
                // If subscription expired or failed, remove it
                if (error.statusCode === 404 || error.statusCode === 410) {
                    console.log(`Push subscription expired for user ${subDoc.user}, removing...`);
                    await NotificationSubscription.deleteOne({ _id: subDoc._id });
                } else {
                    console.error('Error sending push notification:', error);
                }
            }
        });

        await Promise.all(sendPromises);
        console.log(`Push notifications sent to ${subscriptions.length} devices for restaurant ${restaurantId}`);
    } catch (error) {
        console.error('Push service error:', error);
    }
};

module.exports = { sendPushNotification };
