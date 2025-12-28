const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableNumber: { type: String, required: true }, // Can be "1", "A1", etc.
    url: { type: String }, // Full URL for QR scan
    qrCodeImage: { type: String }, // Base64 or path
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
