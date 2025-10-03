require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedAdmin = async () => {
    try {
        await connectDB();

        // Check for force flag
        const forceReseed = process.argv.includes('--force');

        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists && !forceReseed) {
            console.log('\n⚠️  Admin user already exists');
            console.log('To clear and reseed admin, run: yarn seed:admin --force');
            console.log('Email:', adminExists.email);
            console.log('\n');
            process.exit();
        }

        if (forceReseed && adminExists) {
            console.log('\n🗑️  Clearing existing admin user...');
            await User.deleteOne({ _id: adminExists._id });
            console.log('✅ Existing admin user cleared\n');
        }

        console.log('🌱 Creating admin user...\n');

        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@househunting.com',
            password: 'admin123',
            role: 'admin',
            phone: '+254 700 000 001'
        });

        console.log('✅ Admin user created successfully\n');
        console.log('==================== ADMIN ====================');
        console.log('Email:', admin.email);
        console.log('Password: admin123');
        console.log('Role:', admin.role);
        console.log('===============================================');
        console.log('⚠️  Please change the password after first login!');
        console.log('===============================================\n');

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedAdmin();