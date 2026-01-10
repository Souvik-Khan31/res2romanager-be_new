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
        enum: ['Vegetable', 'Fruit', 'Meat', 'Dairy', 'Seafood', 'Dry Goods', 'Spices', 'Frozen', 'Beverage', 'Alcohol', 'Packaging', 'Cleaning', 'Other'],
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
        enum: ['kg', 'g', 'l', 'ml', 'pcs', 'pack', 'box', 'can', 'bottle', 'bunch'],
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
    }
}, {
    timestamps: true
});

// Add index for searching
inventoryItemSchema.index({ name: 'text' });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
