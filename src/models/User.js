const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: function () { return this.role !== 'super-admin'; }
    },
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        // unique: true // Scoped to restaurant? Or global? Ideally unique globally or scoped.
        // For simplicity, let's make it unique globally for now, or use email for login.
        // Prompt says "Username" for staff.
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['super-admin', 'admin', 'cook', 'waiter', 'customer', 'delivery', 'packer'],
        default: 'waiter'
    },
    phone: {
        type: String
    },
    email: { // Optional for staff
        type: String
    },
    address: { type: String },
    pincode: { type: String },
    landmark: { type: String },
    city: { type: String },
    currentSessionId: {
        type: String
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
