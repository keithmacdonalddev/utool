import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Sample user data
const sampleUsers = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    role: 'Admin',
  },
  {
    firstName: 'Emily',
    lastName: 'Johnson',
    email: 'emily.j@example.com',
    role: 'Pro User',
  },
  {
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.b@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Sarah',
    lastName: 'Davis',
    email: 'sarah.d@example.com',
    role: 'Pro User',
  },
  {
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.w@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Jessica',
    lastName: 'Miller',
    email: 'jessica.m@example.com',
    role: 'Pro User',
  },
  {
    firstName: 'Robert',
    lastName: 'Taylor',
    email: 'robert.t@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Jennifer',
    lastName: 'Anderson',
    email: 'jennifer.a@example.com',
    role: 'Admin',
  },
  {
    firstName: 'Thomas',
    lastName: 'Martinez',
    email: 'thomas.m@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Lisa',
    lastName: 'Robinson',
    email: 'lisa.r@example.com',
    role: 'Pro User',
  },
  {
    firstName: 'Daniel',
    lastName: 'Clark',
    email: 'daniel.c@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Nancy',
    lastName: 'Rodriguez',
    email: 'nancy.r@example.com',
    role: 'Pro User',
  },
  {
    firstName: 'Paul',
    lastName: 'Lewis',
    email: 'paul.l@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Karen',
    lastName: 'Lee',
    email: 'karen.l@example.com',
    role: 'Admin',
  },
  {
    firstName: 'Kevin',
    lastName: 'Walker',
    email: 'kevin.w@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Amanda',
    lastName: 'Hall',
    email: 'amanda.h@example.com',
    role: 'Pro User',
  },
  {
    firstName: 'Mark',
    lastName: 'Allen',
    email: 'mark.a@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Michelle',
    lastName: 'Young',
    email: 'michelle.y@example.com',
    role: 'Pro User',
  },
  {
    firstName: 'Steven',
    lastName: 'Hernandez',
    email: 'steven.h@example.com',
    role: 'Regular User',
  },
  {
    firstName: 'Laura',
    lastName: 'King',
    email: 'laura.k@example.com',
    role: 'Admin',
  },
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
        isVerified: true,
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
