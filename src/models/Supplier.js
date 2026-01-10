const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    contactPerson: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        trim: true
    },
    itemsSupplied: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);
