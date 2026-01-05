const SupportMessage = require('../models/SupportMessage');
const asyncHandler = require('express-async-handler');

// @desc    Submit a support message
// @route   POST /api/support
// @access  Public (or semi-public)
const submitMessage = asyncHandler(async (req, res) => {
    const { name, email, subject, message, restaurantId } = req.body;

    const supportMessage = await SupportMessage.create({
        name,
        email,
        subject,
        message,
        restaurantId,
        senderId: req.user ? req.user._id : null
    });

    res.status(201).json({
        success: true,
        data: supportMessage
    });
});

// @desc    Get all support messages
// @route   GET /api/support
// @access  Private/SuperAdmin
const getMessages = asyncHandler(async (req, res) => {
    const messages = await SupportMessage.find()
        .populate('senderId', 'name username role')
        .populate('restaurantId', 'name')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: messages
    });
});

// @desc    Update support message status
// @route   PATCH /api/support/:id
// @access  Private/SuperAdmin
const updateMessageStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const message = await SupportMessage.findById(req.params.id);

    if (!message) {
        res.status(404);
        throw new Error('Message not found');
    }

    message.status = status;
    await message.save();

    res.status(200).json({
        success: true,
        data: message
    });
});

module.exports = {
    submitMessage,
    getMessages,
    updateMessageStatus
};
