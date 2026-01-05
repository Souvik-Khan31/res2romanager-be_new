const express = require('express');
const router = express.Router();
const {
    submitMessage,
    getMessages,
    updateMessageStatus
} = require('../controllers/supportController');
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');

// Public or optionally protected route for submitting messages
router.post('/', optionalProtect, submitMessage);

// Protected routes for super-admin
router.get('/', protect, authorize('super-admin'), getMessages);
router.patch('/:id', protect, authorize('super-admin'), updateMessageStatus);

module.exports = router;
