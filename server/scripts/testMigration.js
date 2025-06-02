// Simple test script to verify migration functionality
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('Testing database connection...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB successfully');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const userCount = await usersCollection.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);

    const usersWithName = await usersCollection.countDocuments({
      name: { $exists: true },
    });
    const usersWithFirstName = await usersCollection.countDocuments({
      firstName: { $exists: true },
    });

    console.log(`👤 Users with 'name' field: ${usersWithName}`);
    console.log(`👤 Users with 'firstName' field: ${usersWithFirstName}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

testConnection();
