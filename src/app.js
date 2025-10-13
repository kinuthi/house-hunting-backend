const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payment');
const settingsRoutes = require('./routes/settings');
const garbageBookingRoutes = require('./routes/garbageBookings');
const garbageCompanyRoutes = require('./routes/garbageCollection');
const contactRoutes = require('./routes/contact');
const moverCompanyRoutes = require('./routes/moverCompany');
const moverBookingRoutes = require('./routes/moverBooking');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Serve static files
app.use('/uploads', express.static('src/uploads'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'House Hunting & Garbage Collection Backend API',
        version: '1.0.0',
        port: process.env.PORT || 5010
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/garbage-bookings', garbageBookingRoutes);
app.use('/api/garbage-companies', garbageCompanyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/mover-companies', moverCompanyRoutes);
app.use('/api/mover-bookings', moverBookingRoutes);

// 404 handler
app.use((req, res, next) => {
    console.log('404 - Route not found:', req.method, req.path);
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.path}`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;