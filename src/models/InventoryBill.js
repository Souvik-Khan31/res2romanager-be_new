const mongoose = require('mongoose');

const inventoryBillSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    billedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: {
        type: String,
        trim: true
    },
    customerPhone: {
        type: String,
        trim: true
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    items: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem'
        },
        name: {
            type: String,
            required: true
        },
        category: String,
        quantityBilled: {
            type: Number,
            required: true
        },
        unit: String,
        sellingPrice: {
            type: Number,
            default: 0
        },
        totalPrice: {
            type: Number,
            default: 0
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('InventoryBill', inventoryBillSchema);
