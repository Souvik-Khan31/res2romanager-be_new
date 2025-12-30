const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const crypto = require('crypto');

const generateTableToken = (restaurantId, tableNumber, secretVersion) => {
    // We use a simple HMAC with a static salt for now, in production use a per-restaurant secret
    const salt = process.env.JWT_SECRET || 'resto-secure-salt';
    return crypto
        .createHmac('sha256', salt)
        .update(`${restaurantId}:${tableNumber}:${secretVersion}`)
        .digest('hex')
        .substring(0, 16); // 16 chars is enough for this purpose
};

// @desc    Get all tables
// @route   GET /api/tables
// @access  Private/Admin (or Public for validation?)
const getTables = async (req, res) => {
    try {
        const tables = await Table.find({ restaurantId: req.user.restaurantId });
        res.json(tables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Table
// @route   POST /api/tables
// @access  Private/Admin
const createTable = async (req, res) => {
    const { tableNumber } = req.body;

    try {
        const existingTable = await Table.findOne({
            restaurantId: req.user.restaurantId,
            tableNumber
        });

        if (existingTable) {
            return res.status(400).json({ message: 'Table number already exists' });
        }

        // Fetch restaurant for secretVersion
        const restaurant = await Restaurant.findById(req.user.restaurantId);
        const secretVersion = restaurant.settings?.secretVersion || 1;

        const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:4200';
        const token = generateTableToken(req.user.restaurantId, tableNumber, secretVersion);
        const qrUrl = `${origin}/menu/${req.user.restaurantId}/${tableNumber}?t=${token}`;

        const table = await Table.create({
            restaurantId: req.user.restaurantId,
            tableNumber,
            url: qrUrl
        });

        res.status(201).json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Table
// @route   DELETE /api/tables/:id
// @access  Private/Admin
const deleteTable = async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);

        if (!table) return res.status(404).json({ message: 'Table not found' });
        if (table.restaurantId.toString() !== req.user.restaurantId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await table.deleteOne();
        res.json({ message: 'Table removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getTables, createTable, deleteTable };
