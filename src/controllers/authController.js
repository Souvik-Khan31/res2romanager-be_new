const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id, sessionId) => {
    return jwt.sign({ id, sessionId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new Restaurant and Super Admin
// @route   POST /api/auth/register-restaurant
// @access  Public
const registerRestaurant = async (req, res) => {
    const {
        restaurantName, ownerName, email, password, phone, address, gstNumber, city
    } = req.body;

    try {
        // Check if restaurant or user exists
        const userExists = await User.findOne({ email });
        const restaurantExists = await Restaurant.findOne({ email }); // Using email as unique for restaurant contact too for now

        if (userExists || restaurantExists) {
            return res.status(400).json({ message: 'User or Restaurant with this email already exists' });
        }

        // Create Restaurant
        const restaurant = await Restaurant.create({
            name: restaurantName,
            ownerName,
            email,
            phone,
            address: `${address}, ${city}`,
            gstNumber
        });

        // Create Admin User
        const sessionId = crypto.randomUUID();
        const user = await User.create({
            restaurantId: restaurant._id,
            name: ownerName,
            email,
            username: email, // Default username is email for admin
            password,
            role: 'admin',
            phone,
            currentSessionId: sessionId
        });

        if (restaurant && user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantId: user.restaurantId,
                token: generateToken(user._id, sessionId),
            });
        } else {
            res.status(400).json({ message: 'Invalid data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { username, password } = req.body;
    // Allow login with email OR username
    // For admin, it's email. For staff, it's username.

    try {
        const user = await User.findOne({
            $or: [{ email: username }, { username: username }]
        });

        if (user && (await user.matchPassword(password))) {
            const restaurant = await Restaurant.findById(user.restaurantId);

            const sessionId = crypto.randomUUID();
            user.currentSessionId = sessionId;
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                restaurantId: user.restaurantId,
                restaurantName: restaurant ? restaurant.name : 'Unknown',
                token: generateToken(user._id, sessionId),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
    const user = await User.findById(req.user._id); // Details populated by middleware, but fetching fresh just in case

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            role: user.role,
            restaurantId: user.restaurantId
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Register a new Customer
// @route   POST /api/auth/register-customer
// @access  Public
const registerCustomer = async (req, res) => {
    const { name, email, password, restaurantId } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const sessionId = crypto.randomUUID();
        const user = await User.create({
            restaurantId,
            name,
            email,
            username: email,
            password,
            role: 'customer',
            currentSessionId: sessionId
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantId: user.restaurantId,
                token: generateToken(user._id, sessionId),
            });
        } else {
            res.status(400).json({ message: 'Invalid data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google Login
// @route   POST /api/auth/google-login
// @access  Public
const googleLogin = async (req, res) => {
    const { idToken, restaurantId, role: requestedRole } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            // If user doesn't exist and it's a customer flow, create user
            if (requestedRole === 'customer') {
                const sessionId = crypto.randomUUID();
                user = await User.create({
                    restaurantId,
                    name,
                    email,
                    username: email,
                    password: crypto.randomBytes(16).toString('hex'), // Random password for Google users
                    role: 'customer',
                    currentSessionId: sessionId,
                    googleId
                });
            } else {
                return res.status(401).json({ message: 'No account associated with this Google email. Please register first.' });
            }
        } else {
            // User exists, update Google ID if not set
            if (!user.googleId) {
                user.googleId = googleId;
            }

            const sessionId = crypto.randomUUID();
            user.currentSessionId = sessionId;
            await user.save();
        }

        const restaurant = user.restaurantId ? await Restaurant.findById(user.restaurantId) : null;

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            restaurantId: user.restaurantId,
            restaurantName: restaurant ? restaurant.name : 'Unknown',
            token: generateToken(user._id, user.currentSessionId),
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Google authentication failed' });
    }
};

module.exports = { registerRestaurant, loginUser, getProfile, registerCustomer, googleLogin };
