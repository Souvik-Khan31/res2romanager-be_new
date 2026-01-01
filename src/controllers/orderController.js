const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const MenuCategory = require('../models/MenuCategory');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { getIo } = require('../../socket');
const { sendPushNotification } = require('../services/pushService');

// @desc    Place New Order
// @route   POST /api/orders
// @access  Public (Customer)
const placeOrder = async (req, res) => {
    const { restaurantId, tableNumber, tableId, orderType, items, advanceRequired, advanceAmount, tableToken, customerLocation, orderNote } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No items in order' });
    }

    try {
        // Fetch restaurant and check if customer login is required
        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Check if ordering is enabled
        if (restaurant.settings?.isOrderingEnabled === false) {
            return res.status(403).json({
                message: 'Ordering is currently paused by the restaurant.',
                isOrderingDisabled: true
            });
        }

        // Table Token Verification (Anti-IDOR)
        if (orderType === 'dine-in' || tableNumber) {
            const crypto = require('crypto');
            const salt = process.env.JWT_SECRET || 'resto-secure-salt';
            const secretVersion = restaurant.settings?.secretVersion || 1;
            const expectedToken = crypto
                .createHmac('sha256', salt)
                .update(`${restaurantId}:${tableNumber}:${secretVersion}`)
                .digest('hex')
                .substring(0, 16);

            if (tableToken !== expectedToken) {
                return res.status(403).json({
                    message: 'Invalid table link. Please scan the QR code again.',
                    invalidToken: true
                });
            }
        }

        // Geofencing Check
        if (restaurant.settings?.geofencingEnabled && restaurant.settings?.location?.latitude) {
            if (!customerLocation || !customerLocation.latitude || !customerLocation.longitude) {
                return res.status(403).json({
                    message: 'Location access is required to place an order at this restaurant.',
                    locationRequired: true
                });
            }

            const getDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371e3; // metres
                const φ1 = lat1 * Math.PI / 180;
                const φ2 = lat2 * Math.PI / 180;
                const Δφ = (lat2 - lat1) * Math.PI / 180;
                const Δλ = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            const distance = getDistance(
                restaurant.settings.location.latitude,
                restaurant.settings.location.longitude,
                customerLocation.latitude,
                customerLocation.longitude
            );

            if (distance > (restaurant.settings.maxDistanceMeters || 100)) {
                return res.status(403).json({
                    message: 'You must be at the restaurant to place an order.',
                    tooFar: true,
                    distance: Math.round(distance)
                });
            }
        }

        // Check if customer login is required
        if (restaurant.settings?.customerLoginRequired) {
            // Check if user is authenticated
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    message: 'Customer login required',
                    requiresAuth: true
                });
            }

            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const User = require('../models/User');
                const user = await User.findById(decoded.id).select('-password');

                if (!user) {
                    return res.status(401).json({
                        message: 'Customer login required - invalid token',
                        requiresAuth: true
                    });
                }

                // Attach user to request for potential future use
                req.user = user;
            } catch (error) {
                return res.status(401).json({
                    message: 'Customer login required - token validation failed',
                    requiresAuth: true
                });
            }
        }

        let billAmount = 0;
        const orderItems = [];

        // Verify items and calculate price from DB to avoid client-side manipulation
        for (const item of items) {
            const dbItem = await MenuItem.findById(item.menuItemId);
            if (!dbItem) {
                // Skip or error? Let's error.
                return res.status(404).json({ message: `Item not found: ${item.menuItemId}` });
            }
            if (!dbItem.isAvailable) {
                return res.status(400).json({ message: `Item out of stock: ${dbItem.name}` });
            }
            const totalPrice = dbItem.price * item.quantity;
            billAmount += totalPrice;

            let courseType = dbItem.courseType;
            if (!courseType || courseType === 'none') {
                // Smart Fallback: Try to infer from category name
                const category = await MenuCategory.findById(dbItem.categoryId);
                if (category) {
                    const catName = category.name.toLowerCase();
                    if (catName.includes('starter') || catName.includes('appetizer') || catName.includes('soup') || catName.includes('salad')) courseType = 'starter';
                    else if (catName.includes('main')) courseType = 'main-course';
                    else if (catName.includes('dessert') || catName.includes('sweet') || catName.includes('ice cream') || catName.includes('cake') || catName.includes('pudding')) courseType = 'dessert';
                    else if (catName.includes('beverage') || catName.includes('drink') || catName.includes('juice') || catName.includes('coffee') || catName.includes('tea') || catName.includes('shake')) courseType = 'beverage';
                }
            }

            orderItems.push({
                menuItemId: dbItem._id,
                name: dbItem.name,
                quantity: item.quantity,
                price: dbItem.price,
                totalPrice,
                notes: item.notes,
                courseType: courseType || 'none'
            });
        }

        // Restaurant already fetched above for login check
        // Fetch Restaurant Settings for Tax
        let taxAmount = 0;
        let serviceChargeAmount = 0;

        if (restaurant.settings.gstPercentage > 0) {
            taxAmount = (billAmount * restaurant.settings.gstPercentage) / 100;
        }
        if (restaurant.settings.enableServiceCharge && restaurant.settings.serviceChargePercentage > 0) {
            serviceChargeAmount = (billAmount * restaurant.settings.serviceChargePercentage) / 100;
        }

        const totalAmount = billAmount + taxAmount + serviceChargeAmount;

        // NEW: Check payment flow setting for initial status
        const paymentFlow = restaurant.settings?.paymentFlow || 'post';
        const initialStatus = paymentFlow === 'pre' ? 'pending-payment' : 'placed';

        const order = new Order({
            restaurantId,
            tableId,
            tableNumber,
            orderType,
            items: orderItems,
            orderNote,
            billAmount,
            taxAmount,
            serviceChargeAmount,
            totalAmount,
            status: initialStatus,
            advanceRequired: advanceRequired || false,
            advanceAmount: advanceAmount || 0,
            timeline: [{ status: initialStatus, user: req.user ? 'Admin' : 'Customer' }]
        });

        // Initialize course statuses based on items in the order using generated IDs
        const courseGroups = {};
        order.items.forEach(item => {
            const course = item.courseType || 'none';
            if (!courseGroups[course]) {
                courseGroups[course] = [];
            }
            courseGroups[course].push(item._id);
        });

        order.courseStatuses = Object.keys(courseGroups).map(courseType => ({
            courseType,
            status: 'pending',
            itemIds: courseGroups[courseType]
        }));

        await order.save();

        // Emit Socket Event
        const io = getIo();
        io.to(restaurantId).emit('newOrder', order);

        res.status(201).json(order);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Orders
// @route   GET /api/orders
// @access  Private (Admin/Cook/Waiter)
const getOrders = async (req, res) => {
    const { status, date, waiterId } = req.query;
    let filter = { restaurantId: new mongoose.Types.ObjectId(req.user.restaurantId.toString()) };

    if (status) {
        filter.status = status;
    }

    // Date filter logic (Move up so we can use it in $or if needed, or just apply to entire query)
    if (date === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
    }

    if (waiterId && waiterId !== 'undefined' && waiterId !== '') {
        try {
            const wId = new mongoose.Types.ObjectId(waiterId.toString());
            const waiter = await User.findById(wId);

            // Fallback: match by waiterId OR by their name/title in the timeline (for orders before field was added)
            const staffMatch = [
                { waiterId: wId }
            ];

            if (waiter) {
                staffMatch.push({ "timeline.user": waiter.name });
                staffMatch.push({ "timeline.user": waiter.role.charAt(0).toUpperCase() + waiter.role.slice(1) }); // e.g. "Waiter"
            }

            filter.$or = staffMatch;
        } catch (err) {
            console.error('Invalid waiterId in query:', waiterId);
        }
    }

    console.log('--- Order Filter ---');
    console.log('User Role:', req.user.role, '| User ID:', req.user._id);
    console.log('Query:', req.query);
    console.log('Final Filter:', JSON.stringify(filter, null, 2));
    console.log('--------------------');

    try {
        const orders = await Order.find(filter).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Single Order (Public for tracking)
// @route   GET /api/orders/:id
// @access  Public
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Order Status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin/Cook/Waiter)
const updateOrderStatus = async (req, res) => {
    const { status, userType, userName } = req.body; // userType passed or derived from req.user

    // Validate Status Transitions if needed

    try {
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        order.status = status;

        // Add to timeline
        order.timeline.push({
            status,
            user: userName || req.user.name || req.user.role
        });

        if (status === 'completed' && order.paymentStatus === 'pending') {
            // Optional: Auto-mark paid? Or keep separate?
        }

        const updatedOrder = await order.save();

        // Emit Socket Event
        const io = getIo();
        io.to(req.user.restaurantId.toString()).emit('orderUpdate', updatedOrder);

        // Send Push Notification if status is ready
        if (status === 'ready') {
            sendPushNotification(req.user.restaurantId.toString(), {
                title: 'Order Ready!',
                body: `Table ${updatedOrder.tableNumber} is ready to serve.`,
                url: '/staff/waiter'
            });
        }

        res.json(updatedOrder);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markOrderAsPaid = async (req, res) => {
    try {
        const { orderId } = req.params;
        const restaurantId = req.user.restaurantId;

        // 1. Check if waiter payment is enabled (only for waiter role, admin can always collect)
        if (req.user.role === 'waiter') {
            const restaurant = await Restaurant.findById(restaurantId);
            if (!restaurant || !restaurant.settings?.waiterPaymentEnabled) {
                return res.status(403).json({ message: 'Waiter payment is not enabled for this restaurant' });
            }
        }

        // 2. Find and update the order
        const order = await Order.findOne({ _id: orderId, restaurantId: restaurantId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const { paymentMethod } = req.body;

        // If already paid
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Order is already paid' });
        }

        order.paymentStatus = 'paid';
        order.paymentMode = (paymentMethod || 'cash').toLowerCase();
        order.status = 'completed'; // Payment completes the order flow usually
        order.waiterId = req.user._id; // Track who collected payment

        // Add to timeline
        order.timeline.push({
            status: 'paid',
            user: req.user.name || 'Waiter (Manual Collection)'
        });

        await order.save();

        // Emit socket event
        const io = getIo();
        io.to(restaurantId.toString()).emit('orderUpdate', order);

        res.json({ message: 'Payment collected successfully', order });

    } catch (error) {
        console.error('Error marking order as paid:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Update Course Status within an Order
// @route   PUT /api/orders/:id/course/:courseType/status
// @access  Private (Cook/Admin)
const updateCourseStatus = async (req, res) => {
    try {
        const { id, courseType } = req.params;
        const { status } = req.body;

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Find the course in courseStatuses
        const courseStatus = order.courseStatuses.find(cs => cs.courseType === courseType);

        if (!courseStatus) {
            return res.status(404).json({ message: `Course '${courseType}' not found in this order` });
        }

        // Update the course status
        courseStatus.status = status;

        // Update overall order status based on course statuses
        // If all courses are served, mark order as served
        const allServed = order.courseStatuses.every(cs => cs.status === 'served');
        if (allServed && order.status !== 'served') {
            order.status = 'served';
            order.timeline.push({
                status: 'served',
                user: req.user.name || req.user.role
            });
        }
        // If any course is preparing, update overall status
        else if (status === 'preparing' && order.status === 'placed') {
            order.status = 'preparing';
            order.timeline.push({
                status: 'preparing',
                user: req.user.name || req.user.role
            });
        }
        // If any course is ready
        else if (status === 'ready') {
            const anyPreparing = order.courseStatuses.some(cs => cs.status === 'preparing');
            // Transition to 'ready' if nothing is currently preparing
            if (!anyPreparing) {
                if (['placed', 'accepted', 'preparing'].includes(order.status)) {
                    order.status = 'ready';
                    order.timeline.push({
                        status: 'ready',
                        user: req.user.name || req.user.role
                    });
                }
            }
        }

        const updatedOrder = await order.save();

        // Emit Socket Event
        const io = getIo();
        io.to(req.user.restaurantId.toString()).emit('orderUpdate', updatedOrder);

        // Send Push Notification if course is ready
        if (status === 'ready') {
            sendPushNotification(req.user.restaurantId.toString(), {
                title: 'Course Ready!',
                body: `${courseType.toUpperCase()} for Table ${updatedOrder.tableNumber} is ready.`,
                url: '/staff/waiter'
            });
        }

        res.json(updatedOrder);

    } catch (error) {
        console.error('Error updating course status:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit Order Rating
// @route   PUT /api/orders/:id/rate
// @access  Public (Customer)
const submitRating = async (req, res) => {
    try {
        const { id } = req.params;
        const { foodRating, serviceRating, ambianceRating, valueRating, feedback, itemRatings } = req.body;

        console.log('Received rating submission for order:', id);
        console.log('Payload:', { foodRating, serviceRating, ambianceRating, valueRating, feedback, itemRatings });

        const order = await Order.findById(id);

        if (!order) {
            console.error('Order not found for ID:', id);
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update overall restaurant ratings (defaults to 0 if not provided)
        order.foodRating = foodRating || 0;
        order.serviceRating = serviceRating || 0;
        order.ambianceRating = ambianceRating || 0;
        order.valueRating = valueRating || 0;
        order.feedback = feedback;

        // Update individual item ratings
        if (itemRatings && Array.isArray(itemRatings)) {
            itemRatings.forEach(ir => {
                const item = order.items.id(ir.itemId);
                if (item) {
                    item.rating = ir.rating || 0;
                }
            });
        }

        await order.save();

        res.json({ message: 'Rating submitted successfully', order });

    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { placeOrder, getOrders, getOrderById, updateOrderStatus, markOrderAsPaid, updateCourseStatus, submitRating };
