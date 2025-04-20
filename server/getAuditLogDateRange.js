/**
 * Script to determine the date range of audit logs in the database
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import AuditLog from './models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function getAuditLogDateRange() {
  try {
    // Get MongoDB connection string from env vars
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      console.error('Error: MONGO_URI environment variable is not defined');
      console.log(
        'Please make sure your .env file exists and contains MONGO_URI'
      );
      return;
    }

    console.log('Connecting to MongoDB...');

    // Use the same connection options as in server.js
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('Connected to MongoDB successfully');

    // Get count of logs
    const totalCount = await AuditLog.countDocuments();
    console.log(`\nTotal audit log entries: ${totalCount}`);

    if (totalCount === 0) {
      console.log('No audit logs found in the database.');
      return;
    }

    // Find oldest log
    const oldestLog = await AuditLog.findOne().sort({ timestamp: 1 });

    // Find newest log
    const newestLog = await AuditLog.findOne().sort({ timestamp: -1 });

    if (oldestLog && newestLog) {
      const oldestDate = new Date(oldestLog.timestamp);
      const newestDate = new Date(newestLog.timestamp);

      console.log('\n📊 AUDIT LOG DATE RANGE');
      console.log('===================================');
      console.log(`First entry: ${oldestDate.toLocaleString()}`);
      console.log(`Latest entry: ${newestDate.toLocaleString()}`);

      // Calculate time span
      const timeDiff = newestDate - oldestDate;
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      console.log(`Span: ${days} days, ${hours} hours, ${minutes} minutes`);
      console.log('===================================');
    } else {
      console.log('Could not determine date range - no logs found.');
    }
  } catch (error) {
    console.error(
      'Error connecting to MongoDB or querying data:',
      error.message
    );
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the function
getAuditLogDateRange();
