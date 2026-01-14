const InventoryItem = require('../models/InventoryItem');
const Supplier = require('../models/Supplier');
const Restaurant = require('../models/Restaurant');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Get all inventory items
 * @route   GET /api/inventory/items
 * @access  Private
 */
const getItems = asyncHandler(async (req, res) => {
    // Support legacy items with no restaurantId
    const items = await InventoryItem.find({
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ]
    }).populate('supplier', 'name').sort({ name: 1 });
    res.json(items);
});

/**
 * @desc    Get single inventory item
 * @route   GET /api/inventory/items/:id
 * @access  Private
 */
const getItem = asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOne({
        _id: req.params.id,
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ]
    }).populate('supplier');

    if (item) {
        res.json(item);
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});

/**
 * @desc    Create inventory item
 * @route   POST /api/inventory/items
 * @access  Private/Admin
 */
const createItem = asyncHandler(async (req, res) => {
    let { name, category, quantity, unit, minThreshold, supplier, costPrice, sellingPrice, barcode } = req.body;

    // Handle empty supplier string
    if (supplier === '') {
        supplier = null;
    }

    const item = new InventoryItem({
        restaurantId: req.user.restaurantId,
        name,
        category,
        quantity,
        unit,
        minThreshold,
        supplier,
        costPrice,
        sellingPrice,
        barcode,
        lastRestocked: quantity > 0 ? Date.now() : null
    });

    const createdItem = await item.save();
    res.status(201).json(createdItem);
});

/**
 * @desc    Update inventory item
 * @route   PUT /api/inventory/items/:id
 * @access  Private/Admin
 */
const updateItem = asyncHandler(async (req, res) => {
    let { name, category, quantity, unit, minThreshold, supplier, costPrice, sellingPrice, barcode } = req.body;

    const item = await InventoryItem.findOne({
        _id: req.params.id,
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ]
    });

    if (item) {
        // Migration: If legacy item, assign restaurantId
        if (!item.restaurantId) {
            item.restaurantId = req.user.restaurantId;
        }

        const previousQuantity = item.quantity;

        // Handle empty supplier string
        if (supplier === '') {
            supplier = null;
        }

        item.name = name || item.name;
        item.category = category || item.category;
        item.quantity = quantity !== undefined ? quantity : item.quantity;
        item.unit = unit || item.unit;
        item.minThreshold = minThreshold !== undefined ? minThreshold : item.minThreshold;
        // Only update supplier if it's explicitly passed (including null) or stay same
        if (supplier !== undefined) item.supplier = supplier;

        item.costPrice = costPrice !== undefined ? costPrice : item.costPrice;
        item.sellingPrice = sellingPrice !== undefined ? sellingPrice : item.sellingPrice;
        if (barcode !== undefined) item.barcode = barcode;

        if (quantity > previousQuantity) {
            item.lastRestocked = Date.now();
        }

        const updatedItem = await item.save();
        res.json(updatedItem);
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});

/**
 * @desc    Delete inventory item
 * @route   DELETE /api/inventory/items/:id
 * @access  Private/Admin
 */
const deleteItem = asyncHandler(async (req, res) => {
    const item = await InventoryItem.findOne({
        _id: req.params.id,
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ]
    });

    if (item) {
        await item.deleteOne();
        res.json({ message: 'Item removed' });
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});

/**
 * @desc    Get low stock items
 * @route   GET /api/inventory/low-stock
 * @access  Private/Admin
 */
const getLowStockItems = asyncHandler(async (req, res) => {
    // Use $expr to compare quantity and minThreshold fields
    const items = await InventoryItem.find({
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ],
        $expr: { $lte: ['$quantity', '$minThreshold'] }
    }).populate('supplier', 'name');

    res.json(items);
});

/**
 * @desc    Get all suppliers
 * @route   GET /api/inventory/suppliers
 * @access  Private
 */
const getSuppliers = asyncHandler(async (req, res) => {
    const suppliers = await Supplier.find({
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ]
    }).sort({ name: 1 });
    res.json(suppliers);
});

/**
 * @desc    Create supplier
 * @route   POST /api/inventory/suppliers
 * @access  Private/Admin
 */
const createSupplier = asyncHandler(async (req, res) => {
    const { name, contactPerson, phone, email, address, itemsSupplied } = req.body;

    const supplier = new Supplier({
        restaurantId: req.user.restaurantId,
        name,
        contactPerson,
        phone,
        email,
        address,
        itemsSupplied
    });

    const createdSupplier = await supplier.save();
    res.status(201).json(createdSupplier);
});

/**
 * @desc    Update supplier
 * @route   PUT /api/inventory/suppliers/:id
 * @access  Private/Admin
 */
const updateSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findOne({
        _id: req.params.id,
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ]
    });

    if (supplier) {
        // Migration: If legacy item, assign restaurantId
        if (!supplier.restaurantId) {
            supplier.restaurantId = req.user.restaurantId;
        }

        supplier.name = req.body.name || supplier.name;
        supplier.contactPerson = req.body.contactPerson || supplier.contactPerson;
        supplier.phone = req.body.phone || supplier.phone;
        supplier.email = req.body.email || supplier.email;
        supplier.address = req.body.address || supplier.address;
        supplier.itemsSupplied = req.body.itemsSupplied || supplier.itemsSupplied;

        const updatedSupplier = await supplier.save();
        res.json(updatedSupplier);
    } else {
        res.status(404);
        throw new Error('Supplier not found');
    }
});

/**
 * @desc    Delete supplier
 * @route   DELETE /api/inventory/suppliers/:id
 * @access  Private/Admin
 */
const deleteSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findOne({
        _id: req.params.id,
        $or: [
            { restaurantId: req.user.restaurantId },
            { restaurantId: { $exists: false } },
            { restaurantId: null }
        ]
    });

    if (supplier) {
        await supplier.deleteOne();
        res.json({ message: 'Supplier removed' });
    } else {
        res.status(404);
        throw new Error('Supplier not found');
    }
});

const processBulkBilling = asyncHandler(async (req, res) => {
    const { items, customerPhone, customerName } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400);
        throw new Error('No items to process');
    }

    // Process each item
    for (const billItem of items) {
        // Skip custom/ad-hoc items
        if (billItem.isCustom || (typeof billItem._id === 'string' && billItem._id.startsWith('custom_')) || (typeof billItem._id === 'string' && billItem._id.startsWith('adhoc_'))) {
            continue;
        }

        const item = await InventoryItem.findOne({
            _id: billItem._id,
            $or: [
                { restaurantId: req.user.restaurantId },
                { restaurantId: { $exists: false } },
                { restaurantId: null }
            ]
        });

        if (item) {
            // Check if enough stock
            if (item.quantity < billItem.billQuantity) {
                res.status(400);
                throw new Error(`Insufficient stock for item: ${item.name}`);
            }

            item.quantity -= billItem.billQuantity;
            await item.save();
        } else {
            // Skip or error? For now, we'll log and continue or just ignore
            console.warn(`Item not found during billing: ${billItem._id}`);
        }
    }

    // Create Audit Log for this billing transaction
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
        restaurantId: req.user.restaurantId,
        user: req.user._id,
        action: 'INVENTORY_BILLING',
        details: `Bulk billing processed for ${items.length} items.${customerName ? ' Customer Name: ' + customerName : ''}${customerPhone ? ' Customer Phone: ' + customerPhone : ''}`,
        entityType: 'Inventory'
    });

    res.status(200).json({ message: 'Billing processed successfully' });
});

/**
 * @desc    Get label designer settings
 * @route   GET /api/inventory/label-settings
 * @access  Private
 */
const getLabelSettings = asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (restaurant) {
        res.json(restaurant.inventoryLabelSettings || {});
    } else {
        res.status(404);
        throw new Error('Restaurant not found');
    }
});

/**
 * @desc    Update label designer settings
 * @route   PUT /api/inventory/label-settings
 * @access  Private/Admin
 */
const updateLabelSettings = asyncHandler(async (req, res) => {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (restaurant) {
        restaurant.inventoryLabelSettings = req.body;
        await restaurant.save();
        res.json(restaurant.inventoryLabelSettings);
    } else {
        res.status(404);
        throw new Error('Restaurant not found');
    }
});

module.exports = {
    getItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    getLowStockItems,
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    processBulkBilling,
    getLabelSettings,
    updateLabelSettings
};
