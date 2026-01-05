const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Check session ID for staff roles
            if (['admin', 'cook', 'waiter'].includes(req.user.role)) {
                if (!decoded.sessionId || decoded.sessionId !== req.user.currentSessionId) {
                    return res.status(401).json({ message: 'Session expired, please login again from this device' });
                }

                // Check if restaurant is blocked or expired
                const restaurant = await Restaurant.findById(req.user.restaurantId);
                if (restaurant) {
                    if (restaurant.isBlocked) {
                        return res.status(403).json({ message: 'This restaurant account is currently suspended. Please contact support.' });
                    }

                    // Block mutation requests if subscription is expired
                    if (restaurant.subscription?.status === 'expired' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                        return res.status(403).json({ message: 'Subscription expired. Please refill to continue using this feature.' });
                    }
                }
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

const optionalProtect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            // If token is invalid, just proceed without req.user
            next();
        }
    } else {
        next();
    }
};

module.exports = { protect, authorize, optionalProtect };
