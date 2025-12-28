const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

// @desc    Get Restaurant Details
// @route   GET /api/restaurants/:id
// @access  Private (or Public depending on need, but Settings is Private)
const getRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Restaurant Settings
// @route   PUT /api/restaurants/:id/settings
// @access  Private (Admin)
const updateRestaurantSettings = async (req, res) => {
    try {
        const { settings } = req.body;
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Ensure user is authorized to update this restaurant
        if (req.user.restaurantId.toString() !== restaurant._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to update this restaurant' });
        }

        // Merge settings
        if (settings) {
            restaurant.settings = { ...restaurant.settings, ...settings };
        }

        // Update basic info
        if (req.body.name) restaurant.name = req.body.name;
        if (req.body.address) restaurant.address = req.body.address;
        if (req.body.description) restaurant.description = req.body.description;

        await restaurant.save();
        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// @desc    Upload QR Code Image
// @route   POST /api/restaurants/:id/upload-qr
// @access  Private (Admin)
const uploadQrImage = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        if (req.user.restaurantId.toString() !== restaurant._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Construct URL (Assuming served statically from /uploads)
        // You might need to adjust the domain depending on your setup or return relative path
        const protocol = req.protocol;
        const host = req.get('host');
        // const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
        // Returning relative path is often safer for different envs, frontend can prepend base URL
        const imageUrl = `/uploads/${req.file.filename}`;

        restaurant.settings.paymentQrImage = imageUrl;
        await restaurant.save();

        res.json({ message: 'QR Code uploaded successfully', imageUrl, settings: restaurant.settings });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Public Restaurant Settings (For Customers)
// @route   GET /api/restaurants/:id/public-settings
// @access  Public
const getPublicSettings = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).select('name settings.customerLoginRequired settings.paymentQrImage settings.paymentFlow');

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        // Return only customer-facing settings
        res.json({
            restaurantName: restaurant.name,
            customerLoginRequired: restaurant.settings?.customerLoginRequired || false,
            paymentQrImage: restaurant.settings?.paymentQrImage || '',
            paymentFlow: restaurant.settings?.paymentFlow || 'post'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Restaurant Ratings (Public)
// @route   GET /api/restaurants/:id/ratings
// @access  Public
const getRestaurantRatings = async (req, res) => {
    try {
        const ratings = await Order.find({
            restaurantId: req.params.id,
            $or: [
                { foodRating: { $gt: 0 } },
                { serviceRating: { $gt: 0 } },
                { ambianceRating: { $gt: 0 } },
                { valueRating: { $gt: 0 } },
                { feedback: { $exists: true, $ne: "" } },
                { "items.rating": { $gt: 0 } }
            ]
        })
            .select('foodRating serviceRating ambianceRating valueRating feedback createdAt items') // Include items for item-wise ratings
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(ratings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getRestaurant, updateRestaurantSettings, uploadQrImage, getPublicSettings, getRestaurantRatings };
