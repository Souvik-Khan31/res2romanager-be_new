const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Get Global Dashboard Stats
// @route   GET /api/super-admin/stats
// @access  Private (Super Admin)
const getDashboardStats = async (req, res) => {
    try {
        const totalRestaurants = await Restaurant.countDocuments();
        const totalOrders = await Order.countDocuments();

        const totalRevenueResult = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        const totalCustomersResult = await User.countDocuments({ role: 'customer' });

        res.json({
            totalRestaurants,
            totalOrders,
            totalRevenue,
            totalCustomers: totalCustomersResult
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get All Restaurants with Admin Details
// @route   GET /api/super-admin/restaurants
// @access  Private (Super Admin)
const getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find().lean();

        // Enhance with admin details, staff counts, and visit stats
        const enhancedRestaurants = await Promise.all(restaurants.map(async (rest) => {
            // 1. Admin Info
            const admin = await User.findOne({ restaurantId: rest._id, role: 'admin' }).select('name email username phone');

            // 2. Staff Counts
            const staffStats = await User.aggregate([
                { $match: { restaurantId: rest._id, role: { $in: ['admin', 'cook', 'waiter'] } } },
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]);

            const staffCounts = {
                admin: staffStats.find(s => s._id === 'admin')?.count || 0,
                cook: staffStats.find(s => s._id === 'cook')?.count || 0,
                waiter: staffStats.find(s => s._id === 'waiter')?.count || 0,
                total: staffStats.reduce((acc, curr) => acc + curr.count, 0)
            };

            // 3. Visit Stats (Total Orders as proxy for visits)
            const totalVisits = await Order.countDocuments({ restaurantId: rest._id });

            // 4. Per Day Visits (Since creation)
            const daysActive = Math.max(1, Math.ceil((new Date() - new Date(rest.createdAt)) / (1000 * 60 * 60 * 24)));
            const visitsPerDay = (totalVisits / daysActive).toFixed(1);

            return {
                ...rest,
                admin,
                staffCounts,
                visitStats: {
                    total: totalVisits,
                    perDay: parseFloat(visitsPerDay)
                }
            };
        }));

        res.json(enhancedRestaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle Restaurant Block Status
// @route   PATCH /api/super-admin/restaurants/:id/toggle-block
// @access  Private (Super Admin)
const toggleBlockRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        restaurant.isBlocked = !restaurant.isBlocked;
        await restaurant.save();

        res.json({ message: `Restaurant ${restaurant.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: restaurant.isBlocked });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Restaurant Subscription
// @route   PUT /api/super-admin/restaurants/:id/subscription
// @access  Private (Super Admin)
const updateSubscription = async (req, res) => {
    try {
        const { status, expireAt, plan } = req.body;
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        if (status) restaurant.subscription.status = status;
        if (expireAt) restaurant.subscription.expireAt = expireAt;
        if (plan) restaurant.subscription.plan = plan;

        await restaurant.save();
        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getAllRestaurants,
    updateSubscription,
    toggleBlockRestaurant
};
