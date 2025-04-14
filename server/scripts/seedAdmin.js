const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path'); // Import path module
const User = require('../models/User'); // Adjust path if necessary

// Load env vars using an absolute path
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1); // Exit process with failure
  }
};

const seedAdminUser = async () => {
  await connectDB();

  const adminEmail = 'macdonaldkeith@hotmail.com';
  const adminPassword = 'auburn10'; // Password will be hashed by pre-save hook

  try {
    // Check if admin user already exists
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log('Admin user already exists.');
      // Optionally update existing user to ensure role and verification status
      if (adminUser.role !== 'Admin' || !adminUser.isVerified) {
        adminUser.role = 'Admin';
        adminUser.isVerified = true;
        // Clear verification token fields if they exist
        adminUser.verificationToken = undefined;
        adminUser.verificationTokenExpires = undefined;
        await adminUser.save();
        console.log('Existing user updated to Admin and verified.');
      }
    } else {
      // Create new admin user
      adminUser = new User({
        email: adminEmail,
        password: adminPassword,
        role: 'Admin',
        isVerified: true, // Mark as verified immediately
        // Add name if desired: name: 'Admin User',
      });
      await adminUser.save(); // Password hashing happens here via pre-save hook
      console.log('Admin user created successfully.');
    }

    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
    process.exit(0); // Exit process with success

  } catch (error) {
    console.error('Error seeding admin user:', error);
    await mongoose.disconnect();
    process.exit(1); // Exit process with failure
  }
};

seedAdminUser();
