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
        serviceChargePercentage: {
            type: Number,
            default: 0
        },
        gstPercentage: {
            type: Number,
            default: 0
        },
        enableServiceCharge: {
            type: Boolean,
            default: false
        },
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
        paymentFlow: {
            type: String,
            enum: ['pre', 'post'],
            default: 'post'
        },
        isOrderingEnabled: {
            type: Boolean,
            default: true
        },
        location: {
            latitude: Number,
            longitude: Number
        },
        geofencingEnabled: {
            type: Boolean,
            default: false
        },
        maxDistanceMeters: {
            type: Number,
            default: 100
        },
        secretVersion: {
            type: Number,
            default: 1 // Increment to invalidate old QR codes
        }
    },
    logoUrl: {
        type: String
    },
    coverImage: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
