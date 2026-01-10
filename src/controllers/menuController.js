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
    const { categoryId, name, description, price, salePrice, type, isAvailable, isHidden, stockQuantity, barcode, trackStock } = req.body;
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
            isHidden: isHidden !== undefined ? isHidden : false,
            stockQuantity: stockQuantity || 0,
            barcode: barcode || undefined,
            trackStock: trackStock !== undefined ? trackStock : false,
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

        const { categoryId, name, description, price, salePrice, type, isAvailable, isHidden, stockQuantity, barcode, trackStock } = req.body;

        item.name = name || item.name;
        item.description = description || item.description;
        item.price = price || item.price;
        if (salePrice !== undefined) item.salePrice = salePrice;
        item.type = type || item.type;
        if (categoryId) item.categoryId = categoryId;
        if (isAvailable !== undefined) item.isAvailable = isAvailable;
        if (isHidden !== undefined) item.isHidden = isHidden;
        if (stockQuantity !== undefined) item.stockQuantity = stockQuantity;
        if (barcode !== undefined) item.barcode = barcode;
        if (trackStock !== undefined) item.trackStock = trackStock;

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

// @desc    Update Category
// @route   PUT /api/menu/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    try {
        const category = await MenuCategory.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        if (category.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { name, description } = req.body;
        category.name = name || category.name;
        category.description = description || category.description;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Category
// @route   DELETE /api/menu/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    try {
        const category = await MenuCategory.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        if (category.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Optional: Delete all items in this category or let the frontend warn the user
        // The frontend warns "Deleting it will also delete all items", so we should clean up items.
        await MenuItem.deleteMany({ categoryId: category._id });

        await category.deleteOne();
        res.json({ message: 'Category removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk Import Categories and Items
// @route   POST /api/menu/bulk-import
// @access  Private/Admin
const bulkImportMenuItems = async (req, res) => {
    const { data, targetRestaurantId } = req.body;
    let restaurantId = req.user.restaurantId;

    // If super-admin, allow overriding restaurantId
    if (req.user.role === 'super-admin' && targetRestaurantId) {
        restaurantId = targetRestaurantId;
    }

    if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array of categories.' });
    }

    try {
        const results = {
            categoriesCreated: 0,
            itemsCreated: 0,
            itemsUpdated: 0
        };

        for (const catData of data) {
            // 1. Find or Create Category
            let category = await MenuCategory.findOne({
                restaurantId,
                name: catData.categoryName
            });

            if (!category) {
                category = await MenuCategory.create({
                    restaurantId,
                    name: catData.categoryName,
                    description: catData.description || '',
                    image: catData.image || ''
                });
                results.categoriesCreated++;
            } else if (catData.image && category.image !== catData.image) {
                // Update image if it changed and is provided
                category.image = catData.image;
                await category.save();
            }

            // 2. Process Items
            for (const itemData of catData.items) {
                let item = await MenuItem.findOne({
                    restaurantId,
                    name: itemData.name,
                    categoryId: category._id
                });

                if (item) {
                    item.price = itemData.price;
                    item.description = itemData.description;
                    item.type = itemData.type || 'veg';
                    item.subCategory = itemData.subCategory || '';
                    item.courseType = itemData.courseType || 'none';
                    item.image = itemData.image;
                    await item.save();
                    results.itemsUpdated++;
                } else {
                    await MenuItem.create({
                        restaurantId,
                        categoryId: category._id,
                        name: itemData.name,
                        description: itemData.description,
                        price: itemData.price,
                        type: itemData.type || 'veg',
                        subCategory: itemData.subCategory || '',
                        courseType: itemData.courseType || 'none',
                        image: itemData.image
                    });
                    results.itemsCreated++;
                }
            }
        }

        res.json({
            message: 'Bulk import completed',
            results
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadCoverImage,
    getRestaurantInfo,
    bulkImportMenuItems
};
