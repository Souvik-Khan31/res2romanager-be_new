const MenuCategory = require('../models/MenuCategory');
const MenuItem = require('../models/MenuItem');
const fs = require('fs');
const path = require('path');

// @desc    Get all categories
// @route   GET /api/menu/categories
// @access  Public (or Private based on needs, usually Public for Customer scan)
const getCategories = async (req, res) => {
    // If public, we might need to pass restaurantId as query param
    // If private/admin, we take from req.user
    // Let's support both
    let restaurantId;
    if (req.user) {
        restaurantId = req.user.restaurantId;
    } else if (req.query.restaurantId) {
        restaurantId = req.query.restaurantId;
    } else {
        return res.status(400).json({ message: 'Restaurant ID required' });
    }

    try {
        const categories = await MenuCategory.find({ restaurantId });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Category
// @route   POST /api/menu/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const category = await MenuCategory.create({
            restaurantId: req.user.restaurantId,
            name,
            description
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Menu Items (Advanced Filter)
// @route   GET /api/menu/items
// @access  Public
const getMenuItems = async (req, res) => {
    let restaurantId;
    if (req.user) {
        restaurantId = req.user.restaurantId;
    } else if (req.query.restaurantId) {
        restaurantId = req.query.restaurantId;
    } else {
        return res.status(400).json({ message: 'Restaurant ID required' });
    }

    try {
        const items = await MenuItem.find({ restaurantId }).populate('categoryId', 'name');
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Menu Item
// @route   POST /api/menu/items
// @access  Private/Admin
const createMenuItem = async (req, res) => {
    const { categoryId, name, description, price, salePrice, type, isAvailable } = req.body;
    let imagePath = '';

    if (req.file) {
        imagePath = req.file.path.replace(/\\/g, "/"); // Fix windows path
    }

    try {
        const item = await MenuItem.create({
            restaurantId: req.user.restaurantId,
            categoryId,
            name,
            description,
            price,
            salePrice: salePrice || undefined,
            type,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            image: imagePath
        });
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Menu Item
// @route   PUT /api/menu/items/:id
// @access  Private/Admin
const updateMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { categoryId, name, description, price, salePrice, type, isAvailable } = req.body;

        item.name = name || item.name;
        item.description = description || item.description;
        item.price = price || item.price;
        if (salePrice !== undefined) item.salePrice = salePrice;
        item.type = type || item.type;
        if (categoryId) item.categoryId = categoryId;
        if (isAvailable !== undefined) item.isAvailable = isAvailable;

        if (req.file) {
            // Optionally delete old image
            if (item.image && fs.existsSync(item.image)) {
                // fs.unlinkSync(item.image); // Careful with this in dev
            }
            item.image = req.file.path.replace(/\\/g, "/");
        }

        const updatedItem = await item.save();
        res.json(updatedItem);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Menu Item
// @route   DELETE /api/menu/items/:id
// @access  Private/Admin
const deleteMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (item.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await item.deleteOne();
        res.json({ message: 'Item removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload Restaurant Cover Image
// @route   POST /api/menu/cover-image
// @access  Private/Admin
const uploadCoverImage = async (req, res) => {
    try {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findOne({ _id: req.user.restaurantId });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Delete old cover image if exists
        if (restaurant.coverImage && fs.existsSync(restaurant.coverImage)) {
            // fs.unlinkSync(restaurant.coverImage); // Optional: uncomment to delete old file
        }

        restaurant.coverImage = req.file.path.replace(/\\/g, "/");
        await restaurant.save();

        res.json({
            message: 'Cover image uploaded successfully',
            coverImage: restaurant.coverImage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Restaurant Info (including cover image)
// @route   GET /api/menu/restaurant-info
// @access  Public
const getRestaurantInfo = async (req, res) => {
    let restaurantId;
    if (req.user) {
        restaurantId = req.user.restaurantId;
    } else if (req.query.restaurantId) {
        restaurantId = req.query.restaurantId;
    } else {
        return res.status(400).json({ message: 'Restaurant ID required' });
    }

    try {
        const Restaurant = require('../models/Restaurant');
        const restaurant = await Restaurant.findById(restaurantId)
            .select('name ownerName address phone coverImage logoUrl settings description');

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadCoverImage,
    getRestaurantInfo
};
