const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    notes: String,
    courseType: { type: String, enum: ['starter', 'main-course', 'dessert', 'beverage', 'none'], default: 'none' },
    rating: { type: Number, max: 5, default: 0 }
});

const orderSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' }, // Nullable if takeaway from ongoing counter?
    tableNumber: { type: String }, // Snapshot for easy display
    orderType: { type: String, enum: ['dine-in', 'takeaway'], required: true },

    // Customer Details
    customerName: { type: String },
    customerPhone: { type: String },

    items: [orderItemSchema],
    orderNote: { type: String },

    // Course-level status tracking for multi-course orders
    courseStatuses: [{
        courseType: { type: String, enum: ['starter', 'main-course', 'dessert', 'beverage', 'none'] },
        status: { type: String, enum: ['pending', 'preparing', 'ready', 'served'], default: 'pending' },
        itemIds: [{ type: mongoose.Schema.Types.ObjectId }] // References to items in this course
    }],

    billAmount: { type: Number, required: true }, // Subtotal
    taxAmount: { type: Number, default: 0 },
    serviceChargeAmount: { type: Number, default: 0 },
    packagingCharge: { type: Number, default: 0 },
    appliedCharges: [{
        name: String,
        chargeType: String, // Renamed from 'type' to avoid Mongoose collision
        value: Number,
        amount: Number
    }],
    totalAmount: { type: Number, required: true }, // Final

    status: {
        type: String,
        enum: ['placed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
        default: 'placed'
    },

    paymentStatus: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
    paymentMode: { type: String, enum: ['cash', 'online', 'upi'] },

    // PhonePe specific fields
    phonepeTransactionId: { type: String },
    phonepePaymentStatus: { type: String },
    phonepeResponse: { type: mongoose.Schema.Types.Mixed },

    advanceRequired: { type: Boolean, default: false },
    advanceAmount: { type: Number, default: 0 },

    cancellationReason: { type: String },

    timeline: [
        {
            status: String,
            timestamp: { type: Date, default: Date.now },
            user: { type: String } // "Customer", or Admin/Staff Name
        }
    ],
    waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    servedBy: { type: String }, // Name of the staff who served/delivered the order
    servedAt: { type: Date },

    // Ratings & Feedback
    foodRating: { type: Number, max: 5, default: 0 },
    serviceRating: { type: Number, max: 5, default: 0 },
    ambianceRating: { type: Number, max: 5, default: 0 },
    valueRating: { type: Number, max: 5, default: 0 },
    feedback: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
