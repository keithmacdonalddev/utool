import mongoose from 'mongoose';
import User from '../models/User.js'; // Adjust path as necessary
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file at the parent directory of 'scripts'
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Safeguard: Ensure this script only runs in a development environment
if (process.env.NODE_ENV !== 'development') {
  console.error('ERROR: This script is intended for development use only.');
  console.error('It will not run if NODE_ENV is not set to "development".');
  console.error(
    'If you intend to run this in a different environment, please ensure you understand the risks'
  );
  console.error(
    'and have taken appropriate precautions, then update this script accordingly.'
  );
  process.exit(1);
}

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
        firstName: 'Keith',
        lastName: 'MacDonald',
        email: adminEmail,
        password: adminPassword,
        role: 'Admin',
        isVerified: true, // Mark as verified immediately
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
