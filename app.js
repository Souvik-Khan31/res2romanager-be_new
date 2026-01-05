const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
// Serve static files (uploads) with caching (1 day)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d', // Cache for 1 day
    etag: true
}));

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/menu', require('./src/routes/menuRoutes'));
app.use('/api/tables', require('./src/routes/tableRoutes'));
app.use('/api/orders', require('./src/routes/orderRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));
app.use('/api/restaurants', require('./src/routes/restaurantRoutes'));
app.use('/api/phonepe', require('./src/routes/phonepeRoutes'));
app.use('/api/push', require('./src/routes/pushRoutes'));
app.use('/api/super-admin', require('./src/routes/superAdminRoutes'));
app.use('/api/support', require('./src/routes/supportRoutes'));

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));
app.get('/', (req, res) => res.send('Restaurant SaaS API Running'));

const { errorHandler } = require('./src/middleware/errorMiddleware');
app.use(errorHandler);

module.exports = app;
