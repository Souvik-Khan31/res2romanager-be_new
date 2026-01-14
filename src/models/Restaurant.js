const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    gstNumber: {
        type: String
    },
    description: {
        type: String,
        default: 'Delicious cuisine crafted with passion'
    },
    settings: {
        additionalCharges: [{
            name: { type: String, required: true },
            type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
            value: { type: Number, required: true, default: 0 },
            applicableTo: { type: String, enum: ['all', 'dine-in', 'takeaway', 'online'], default: 'all' },
            isOptional: { type: Boolean, default: false },
            isEnabled: { type: Boolean, default: true }
        }],
        currency: {
            type: String,
            default: 'USD' // Customizable
        },
        waiterPaymentEnabled: {
            type: Boolean,
            default: false
        },
        paymentQrImage: {
            type: String, // URL to the QR code image
            default: ''
        },
        upiId: {
            type: String,
            default: ''
        },
        customerLoginRequired: {
            type: Boolean,
            default: false
        },
        offerAds: [{
            text: { type: String, required: true },
            active: { type: Boolean, default: true }
        }],
        paymentFlow: {
            type: String,
            enum: ['pre', 'post'],
            default: 'post'
        },
        isOrderingEnabled: {
            type: Boolean,
            default: true
        },
        qrMenuMode: {
            type: String,
            enum: ['order', 'browse'],
            default: 'order'
        },
        location: {
            latitude: Number,
            longitude: Number
        },
        geofencingEnabled: {
            type: Boolean,
            default: false
        },
        isOrderNoteEnabled: {
            type: Boolean,
            default: true
        },
        maxDistanceMeters: {
            type: Number,
            default: 100
        },
        isTakeawayChargeEnabled: {
            type: Boolean,
            default: false
        },
        takeawayCharge: {
            type: Number,
            default: 0
        },
        // Online Ordering Settings
        onlineOrdering: {
            isEnabled: { type: Boolean, default: false },
            deliveryFee: { type: Number, default: 0 },
            minOrderAmount: { type: Number, default: 0 },
            packagingFee: { type: Number, default: 0 },
            deliveryRadiusMeters: { type: Number, default: 5000 },
            loginRequired: { type: Boolean, default: true },
            locationRequired: { type: Boolean, default: true },
            autoKOT: { type: Boolean, default: false }
        },
        secretVersion: {
            type: Number,
            default: 1 // Increment to invalidate old QR codes
        }
    },
    inventoryLabelSettings: {
        type: mongoose.Schema.Types.Mixed,
        default: {} // Stores the complete label settings object
    },
    logoUrl: {
        type: String
    },
    coverImage: {
        type: String
    },
    subscription: {
        status: {
            type: String,
            enum: ['active', 'expired', 'trial'],
            default: 'trial'
        },
        expireAt: {
            type: Date,
            default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
        },
        plan: {
            type: String,
            default: 'free'
        }
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
