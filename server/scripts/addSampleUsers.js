const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Sample user data
const sampleUsers = [
  { name: 'John Smith', email: 'john.smith@example.com', role: 'Admin' },
  { name: 'Emily Johnson', email: 'emily.j@example.com', role: 'Pro User' },
  { name: 'Michael Brown', email: 'michael.b@example.com', role: 'Regular User' },
  { name: 'Sarah Davis', email: 'sarah.d@example.com', role: 'Pro User' },
  { name: 'David Wilson', email: 'david.w@example.com', role: 'Regular User' },
  { name: 'Jessica Miller', email: 'jessica.m@example.com', role: 'Pro User' },
  { name: 'Robert Taylor', email: 'robert.t@example.com', role: 'Regular User' },
  { name: 'Jennifer Anderson', email: 'jennifer.a@example.com', role: 'Admin' },
  { name: 'Thomas Martinez', email: 'thomas.m@example.com', role: 'Regular User' },
  { name: 'Lisa Robinson', email: 'lisa.r@example.com', role: 'Pro User' },
  { name: 'Daniel Clark', email: 'daniel.c@example.com', role: 'Regular User' },
  { name: 'Nancy Rodriguez', email: 'nancy.r@example.com', role: 'Pro User' },
  { name: 'Paul Lewis', email: 'paul.l@example.com', role: 'Regular User' },
  { name: 'Karen Lee', email: 'karen.l@example.com', role: 'Admin' },
  { name: 'Kevin Walker', email: 'kevin.w@example.com', role: 'Regular User' },
  { name: 'Amanda Hall', email: 'amanda.h@example.com', role: 'Pro User' },
  { name: 'Mark Allen', email: 'mark.a@example.com', role: 'Regular User' },
  { name: 'Michelle Young', email: 'michelle.y@example.com', role: 'Pro User' },
  { name: 'Steven Hernandez', email: 'steven.h@example.com', role: 'Regular User' },
  { name: 'Laura King', email: 'laura.k@example.com', role: 'Admin' }
];

async function createSampleUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash('password', 12);
      
      const user = new User({
        ...userData,
        password: hashedPassword,
        isVerified: true
      });

      await user.save();
      console.log(`Created user: ${user.email}`);
    }

    console.log('Successfully created all sample users');
  } catch (error) {
    console.error('Error creating sample users:', error);
  } finally {
    mongoose.disconnect();
  }
}

createSampleUsers();
