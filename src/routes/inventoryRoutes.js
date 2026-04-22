const express = require('express');
const router = express.Router();
const {
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
    processBulkBilling,
    getBillingHistory,
    getLabelSettings,
    updateLabelSettings
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Billing Routes
router.route('/billing/bulk')
    .post(protect, processBulkBilling);

router.route('/billing/history')
    .get(protect, authorize('admin', 'super-admin'), getBillingHistory);

// Label Designer Settings
router.route('/label-settings')
    .get(protect, getLabelSettings)
    .put(protect, authorize('admin', 'super-admin'), updateLabelSettings);

// Inventory Items Routes
router.route('/items')
    .get(protect, getItems)
    .post(protect, authorize('admin', 'super-admin'), createItem);

router.route('/items/low-stock')
    .get(protect, authorize('admin', 'super-admin'), getLowStockItems);

router.route('/items/:id')
    .get(protect, getItem)
    .put(protect, authorize('admin', 'super-admin'), updateItem)
    .delete(protect, authorize('admin', 'super-admin'), deleteItem);

// Supplier Routes
router.route('/suppliers')
    .get(protect, getSuppliers)
    .post(protect, authorize('admin', 'super-admin'), createSupplier);

router.route('/suppliers/:id')
    .put(protect, authorize('admin', 'super-admin'), updateSupplier)
    .delete(protect, authorize('admin', 'super-admin'), deleteSupplier);

module.exports = router;
