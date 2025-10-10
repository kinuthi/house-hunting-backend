// migration-fix-locations.js
const mongoose = require('mongoose');
const Property = require('./src/models/Property');

async function fixLocations() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://kadijamii231_db_user:rfew8IT357OPwyh6@cluster0.k6dzgfx.mongodb.net/house-hunting?retryWrites=true&w=majority&appName=Cluster0");

        // Find all properties with invalid location data
        const properties = await Property.find({
            $or: [
                { 'location.coordinates': { $exists: false } },
                { 'location.coordinates': [] },
                { 'location.coordinates': null }
            ]
        });

        console.log(`Found ${properties.length} properties with invalid locations`);

        for (const property of properties) {
            // Option 1: Remove the location field if no coordinates available
            property.location = undefined;
            await property.save({ validateBeforeSave: false });
            console.log(`Fixed property ${property._id}`);
        }

        console.log('Migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixLocations();