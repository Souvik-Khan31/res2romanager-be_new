const webpush = require('web-push');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const NotificationSubscription = require('../models/NotificationSubscription');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../config/serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized for FCM');
} else {
    console.warn('WARNING: config/serviceAccountKey.json not found. FCM notifications will NOT work.');
}

// Configure VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@restaurant.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('VAPID details configured for Push Notifications');
} else {
    console.warn('WARNING: VAPID keys not found. Web Push notifications will NOT work.');
}

/**
 * Send push notification to all subscriptions of a specific restaurant and optionally specific roles/users
 */
const sendPushNotification = async (restaurantId, { title, body, icon, data, url }) => {
    try {
        console.log(`Sending push notification: "${title}" for restaurant ${restaurantId}`);
        // Find all active subscriptions for this restaurant
        const subscriptions = await NotificationSubscription.find({ restaurantId });

        const webPushPayload = JSON.stringify({
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

        const fcmMessage = {
            notification: {
                title,
                body
            },
            data: {
                url: url || '/',
                ...data
            }
        };

        const sendPromises = subscriptions.map(async (subDoc) => {
            try {
                if (subDoc.fcmToken) {
                    // Send via FCM
                    await admin.messaging().send({
                        token: subDoc.fcmToken,
                        ...fcmMessage
                    });
                } else if (subDoc.subscription) {
                    // Send via Web Push
                    await webpush.sendNotification(subDoc.subscription, webPushPayload);
                }
            } catch (error) {
                // If subscription expired or failed, remove it
                if (error.statusCode === 404 || error.statusCode === 410 || error.code === 'messaging/registration-token-not-registered') {
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
