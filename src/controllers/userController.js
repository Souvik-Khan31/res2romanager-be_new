const User = require('../models/User');

// @desc    Create new staff member (Cook/Waiter)
// @route   POST /api/users
// @access  Private/Admin
const createStaff = async (req, res) => {
    const { name, role, phone, email, username, password } = req.body;

    // Roles allowed to be created: cook, waiter, admin
    if (!['cook', 'waiter', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Can only create cook, waiter, or admin.' });
    }

    try {
        const userExists = await User.findOne({ username, restaurantId: req.user.restaurantId });
        if (userExists) {
            return res.status(400).json({ message: 'Username already exists for this restaurant' });
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

// @desc    Get all staff for restaurant
// @route   GET /api/users
// @access  Private/Admin
const getStaff = async (req, res) => {
    try {
        // Now fetching all users including other admins (except maybe the current one if we wanted, but let's show all)
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

        // Ensure user belongs to admin's restaurant
        if (user.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await user.deleteOne(); // or user.remove() depending on mongoose version
        res.json({ message: 'Staff removed' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createStaff, getStaff, deleteStaff };
