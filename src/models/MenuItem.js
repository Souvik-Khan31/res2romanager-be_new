const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    salePrice: { type: Number }, // Optional discounted price
    image: String,
    isAvailable: { type: Boolean, default: true }, // Out of Stock
    isHidden: { type: Boolean, default: false }, // Hidden from customers
    type: { type: String, enum: ['veg', 'non-veg', 'egg'], default: 'veg' },
    subCategory: { type: String },
    courseType: { type: String, enum: ['starter', 'main-course', 'dessert', 'beverage', 'none'], default: 'none' },
    stockQuantity: { type: Number, default: 0 },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    trackStock: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
