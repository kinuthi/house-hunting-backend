require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedUsers = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ Error: MONGODB_URI is not defined in .env file');
            process.exit(1);
        }

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
            phone: '0746665877',
            password: 'admin123',
            role: 'admin'
        });

        // Create Property Manager Users with dummy ID documents
        const propertyManager1 = await User.create({
            name: 'John Property Manager',
            phone: '0700000002',
            password: 'manager123',
            role: 'property_manager',
            approvalStatus: 'approved',
            idDocument: {
                front: 'https://via.placeholder.com/400x300?text=ID+Front',
                back: 'https://via.placeholder.com/400x300?text=ID+Back',
                idNumber: '12345678',
                idType: 'national_id',
                isVerified: true
            }
        });

        const propertyManager2 = await User.create({
            name: 'Sarah Property Manager',
            phone: '0700000003',
            password: 'manager123',
            role: 'property_manager',
            approvalStatus: 'approved',
            idDocument: {
                front: 'https://via.placeholder.com/400x300?text=ID+Front',
                back: 'https://via.placeholder.com/400x300?text=ID+Back',
                idNumber: '87654321',
                idType: 'national_id',
                isVerified: true
            }
        });

        // Create Customer Users
        const customer1 = await User.create({
            name: 'Alice Customer',
            phone: '0700000004',
            password: 'customer123',
            role: 'customer'
        });

        const customer2 = await User.create({
            name: 'Bob Customer',
            phone: '0700000005',
            password: 'customer123',
            role: 'customer'
        });

        const customer3 = await User.create({
            name: 'Carol Customer',
            phone: '0700000006',
            password: 'customer123',
            role: 'customer'
        });

        console.log('\n✅ Users created successfully!\n');

        console.log('==================== ADMIN ====================');
        console.log('Phone:', admin.phone);
        console.log('Password: admin123');
        console.log('Role:', admin.role);

        console.log('\n============== PROPERTY MANAGERS ==============');
        console.log('1. Phone:', propertyManager1.phone);
        console.log('   Password: manager123');
        console.log('   Role:', propertyManager1.role);
        console.log('   Status: Approved & Verified');

        console.log('\n2. Phone:', propertyManager2.phone);
        console.log('   Password: manager123');
        console.log('   Role:', propertyManager2.role);
        console.log('   Status: Approved & Verified');

        console.log('\n================= CUSTOMERS ===================');
        console.log('1. Phone:', customer1.phone);
        console.log('   Password: customer123');
        console.log('   Role:', customer1.role);

        console.log('\n2. Phone:', customer2.phone);
        console.log('   Password: customer123');
        console.log('   Role:', customer2.role);

        console.log('\n3. Phone:', customer3.phone);
        console.log('   Password: customer123');
        console.log('   Role:', customer3.role);

        console.log('\n===============================================');
        console.log('⚠️  Please change all passwords after first login!');
        console.log('===============================================\n');

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

seedUsers();