const User = require('../models/User');

// @desc    Create new staff member (Cook/Waiter)
// @route   POST /api/users
// @access  Private/Admin
const createStaff = async (req, res) => {
    const { name, role, phone, email, username, password } = req.body;

    // Roles allowed to be created: cook, waiter, admin, delivery, packer
    if (!['cook', 'waiter', 'admin', 'delivery', 'packer'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Can only create cook, waiter, admin, delivery, or packer.' });
    }

    try {
        // Check if username exists globally (across all restaurants)
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already exists. Please choose a different username.' });
        }

        const user = await User.create({
            restaurantId: req.user.restaurantId,
            name,
            role,
            phone,
            email,
            username,
            password
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if username is available
// @route   GET /api/users/check-username/:username
// @access  Private/Admin
const checkUsernameAvailability = async (req, res) => {
    try {
        const { username } = req.params;
        const userExists = await User.findOne({ username });

        res.json({
            available: !userExists,
            message: userExists ? 'Username already exists' : 'Username is available'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all staff for restaurant
// @route   GET /api/users
// @access  Private/Admin
const getStaff = async (req, res) => {
    try {
        const users = await User.find({ restaurantId: req.user.restaurantId }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete staff
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteStaff = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        if (user.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await user.deleteOne();
        res.json({ message: 'Staff removed' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update staff status/details
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateStaff = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        if (user.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { name, role, phone, email, isActive } = req.body;

        if (name) user.name = name;
        if (role) user.role = role;
        if (phone) user.phone = phone;
        if (email) user.email = email;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();
        res.json(user);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all customers (for Admin/Super-Admin)
// @route   GET /api/users/customers
// @access  Private/Admin
const getCustomers = async (req, res) => {
    try {
        let query = { role: 'customer' };

        // If not super-admin, filter by restaurantId
        if (req.user.role !== 'super-admin') {
            query.restaurantId = req.user.restaurantId;
        }

        const customers = await User.find(query)
            .populate('restaurantId', 'name')
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createStaff, getStaff, deleteStaff, updateStaff, checkUsernameAvailability, getCustomers };
