require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = 5010;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        console.log('📍 Database:', mongoose.connection.name);
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Start server
app.listen(PORT, () => {
    console.log('🚀 Server is running');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});