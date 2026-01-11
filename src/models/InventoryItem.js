const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        default: 'Other'
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    unit: {
        type: String,
        required: true,
        default: 'pcs'
    },
    minThreshold: {
        type: Number,
        default: 5
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    costPrice: {
        type: Number,
        default: 0
    },
    sellingPrice: {
        type: Number,
        default: 0
    },
    lastRestocked: {
        type: Date
    },
    barcode: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    customFields: [{
        key: { type: String, trim: true },
        value: { type: String, trim: true }
    }]
}, {
    timestamps: true
});

// Add index for searching
inventoryItemSchema.index({ name: 'text' });
// Add compound index for barcode Uniqueness per restaurant
inventoryItemSchema.index({ barcode: 1, restaurantId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
