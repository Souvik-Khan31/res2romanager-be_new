const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: String
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    entityType: {
        type: String // 'Order', 'Menu', 'Staff'
    },
    ipAddress: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
