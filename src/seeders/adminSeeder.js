require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedUsers = async () => {
    try {
        await connectDB();

        // Check if users already exist
        const existingUsers = await User.countDocuments();

        if (existingUsers > 0) {
            console.log('Users already exist in database');
            console.log('Do you want to clear existing users and reseed? (Not recommended for production)');
            process.exit();
        }

        // Create Admin User
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@househunting.com',
            password: 'admin123',
            role: 'admin',
            phone: '+254 700 000 001'
        });

        // Create Property Manager Users
        const propertyManager1 = await User.create({
            name: 'John Property Manager',
            email: 'john.pm@househunting.com',
            password: 'manager123',
            role: 'property_manager',
            phone: '+254 700 000 002'
        });

        const propertyManager2 = await User.create({
            name: 'Sarah Property Manager',
            email: 'sarah.pm@househunting.com',
            password: 'manager123',
            role: 'property_manager',
            phone: '+254 700 000 003'
        });

        // Create Customer Users
        const customer1 = await User.create({
            name: 'Alice Customer',
            email: 'alice@example.com',
            password: 'customer123',
            role: 'customer',
            phone: '+254 700 000 004'
        });

        const customer2 = await User.create({
            name: 'Bob Customer',
            email: 'bob@example.com',
            password: 'customer123',
            role: 'customer',
            phone: '+254 700 000 005'
        });

        const customer3 = await User.create({
            name: 'Carol Customer',
            email: 'carol@example.com',
            password: 'customer123',
            role: 'customer',
            phone: '+254 700 000 006'
        });

        console.log('\n✅ Users created successfully!\n');

        console.log('==================== ADMIN ====================');
        console.log('Email:', admin.email);
        console.log('Password: admin123');
        console.log('Role:', admin.role);

        console.log('\n============== PROPERTY MANAGERS ==============');
        console.log('1. Email:', propertyManager1.email);
        console.log('   Password: manager123');
        console.log('   Role:', propertyManager1.role);

        console.log('\n2. Email:', propertyManager2.email);
        console.log('   Password: manager123');
        console.log('   Role:', propertyManager2.role);

        console.log('\n================= CUSTOMERS ===================');
        console.log('1. Email:', customer1.email);
        console.log('   Password: customer123');
        console.log('   Role:', customer1.role);

        console.log('\n2. Email:', customer2.email);
        console.log('   Password: customer123');
        console.log('   Role:', customer2.role);

        console.log('\n3. Email:', customer3.email);
        console.log('   Password: customer123');
        console.log('   Role:', customer3.role);

        console.log('\n===============================================');
        console.log('⚠️  Please change all passwords after first login!');
        console.log('===============================================\n');

        process.exit();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

seedUsers();