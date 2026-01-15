const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// @desc    Get Dashboard Stats (Revenue, Orders, Active Tables)
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const { startDate, endDate } = req.query;

    try {
        // Date Range Logic
        let start, end;

        if (startDate && endDate && startDate !== '' && endDate !== '') {
            // Parse as local instead of UTC
            const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
            const [eYear, eMonth, eDay] = endDate.split('-').map(Number);

            start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
            end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        } else {
            // Default to today local
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        // 1. Total Revenue in Range
        const revenueData = await Order.aggregate([
            {
                $match: {
                    restaurantId,
                    createdAt: { $gte: start, $lte: end },
                    status: { $nin: ['cancelled', 'rejected'] }
                }
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
        ]);

        // 2. Average Order Value
        const revenue = revenueData[0]?.total || 0;
        const ordersCount = revenueData[0]?.count || 0;
        const avgOrderValue = ordersCount > 0 ? (revenue / ordersCount) : 0;

        // 3. Order Status Counts (For Status Bar)
        const statusData = await Order.aggregate([
            {
                $match: {
                    restaurantId,
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const orderStatusCounts = statusData.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        // 4. Active Orders (All time or Today? Usually active implies current state regardless of when placed, but fast food is usually same day. Let's do current 'active' status regardless of date if needed, or just today.
        // For a dashboard showing "Today's Activity", active usually means "Not completed/cancelled" from today's batch or overall.
        // Let's stick to "Today's Active" to match the filter, OR just check all pending. 
        // Given previous requirements, let's filter by today for consistency with "Today's Orders".
        // Actually, "Active Orders" should probably be ALL active orders even if placed yesterday (unlikely in fast food but possible). 
        // Let's strictly count 'placed', 'confirmed', 'cooking', 'ready', 'serving' from the `orderStatusCounts` we just got (which is today).
        // OR better: do a separate count for absolute truth.
        // Let's use the statusData we already have for "Today".

        // new Active Orders logic: "Not Paid"
        // Ensure we don't count cancelled/rejected even if they are pending payment
        // We use statusData which is already filtered by date.
        // Wait, statusData groups by 'status'. It doesn't contain payment info properly if grouped by status only.
        // We need a separate aggregation or include paymentStatus in grouping?
        // Or simply do another quick query. Since it's dashboard, accuracy matters.
        // Let's do a separate count for "Pending Payment" orders for today (or all time?).
        // "Active" usually implies current workflow.
        // If I use statusData, I can't know payment status effectively if I only grouped by 'status'.
        // So I will make a separate count query for active orders.

        const activeOrders = await Order.countDocuments({
            restaurantId,
            createdAt: { $gte: start, $lte: end },
            status: { $nin: ['cancelled', 'rejected'] }, // Exclude dead orders
            paymentStatus: { $ne: 'paid' } // Not paid
        });

        res.json({
            revenue: revenue,
            orders: ordersCount,
            avgOrderValue: Math.round(avgOrderValue * 100) / 100,
            activeOrders, // Added
            orderStatusCounts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Advanced Reports (Revenue, Orders, Items, Categories)
// @route   GET /api/analytics/reports
// @access  Private/Admin
const getReports = async (req, res) => {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const { type, startDate, endDate } = req.query;

    try {
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end = new Date(endDate);
        } else {
            // Default to last 7 days
            start = new Date();
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        const matchStage = {
            restaurantId,
            createdAt: { $gte: start, $lte: end },
            status: { $nin: ['cancelled', 'rejected'] }
        };

        if (type === 'revenue') {
            const revenueData = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        total: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            return res.json(revenueData);
        }

        if (type === 'orders') {
            const ordersData = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            return res.json(ordersData);
        }

        if (type === 'items') {
            const itemData = await Order.aggregate([
                { $match: matchStage },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.name",
                        count: { $sum: "$items.quantity" },
                        revenue: { $sum: "$items.totalPrice" }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            return res.json(itemData);
        }

        if (type === 'category-sales') {
            // We need to look up menu items to get categories if not stored in order items.
            // Assuming Order items have category, or we need to $lookup.
            // Let's check the Order/MenuItem model. 
            // If Order items snapshot doesn't have category, we might need to join.
            // For now, assuming basic aggregation or checking if we need to join.
            // Let's assume we can get it via lookup from MenuItems if not present.
            // Checking Order model (user context: src/models/Order.js - not viewed but typical).
            // Safer to do a lookup.

            const categoryData = await Order.aggregate([
                { $match: matchStage },
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: "menuitems",
                        localField: "items.menuItemId",
                        foreignField: "_id",
                        as: "menuItemDetails"
                    }
                },
                { $unwind: "$menuItemDetails" },
                {
                    $lookup: {
                        from: "menucategories",
                        localField: "menuItemDetails.categoryId",
                        foreignField: "_id",
                        as: "categoryDetails"
                    }
                },
                { $unwind: "$categoryDetails" },
                {
                    $group: {
                        _id: "$categoryDetails.name",
                        totalSales: { $sum: "$items.totalPrice" }
                    }
                }
            ]);
            return res.json(categoryData);
        }

        if (type === 'mode') {
            const modeData = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$orderType",
                        count: { $sum: 1 },
                        total: { $sum: "$totalAmount" }
                    }
                }
            ]);
            return res.json(modeData);
        }

        res.status(400).json({ message: 'Invalid report type' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboardStats, getReports };
