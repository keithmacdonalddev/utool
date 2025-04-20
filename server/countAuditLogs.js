/**
 * Script to count AuditLog entries in the database
 * This script uses the same connection method as the main application
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import { fileURLToPath } from 'url';
import path from 'path';
import AuditLog from './models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function countAuditLogs() {
  // Get MongoDB connection string from env vars
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error('Error: MONGO_URI environment variable is not defined');
    console.log(
      'Please make sure your .env file exists and contains MONGO_URI'
    );
    return;
  }

  try {
    console.log('Connecting to MongoDB...');

    // Use the same connection options as in server.js
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('Connected to MongoDB successfully');

    // Count all audit log entries
    const totalCount = await AuditLog.countDocuments();
    console.log(`\n======================================`);
    console.log(`Total Audit Log Entries: ${totalCount}`);
    console.log(`======================================\n`);

    // Count entries by action type
    const actionCounts = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (actionCounts.length > 0) {
      console.log('Breakdown by action type:');
      actionCounts.forEach((item) => {
        console.log(`  ${item._id}: ${item.count}`);
      });
    }

    // Count entries by status
    const statusCounts = await AuditLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (statusCounts.length > 0) {
      console.log('\nBreakdown by status:');
      statusCounts.forEach((item) => {
        console.log(`  ${item._id}: ${item.count}`);
      });
    }

    // Get the most recent entries
    const recentEntries = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(1)
      .populate('userId', 'name email');

    if (recentEntries.length > 0) {
      const latest = recentEntries[0];
      console.log('\nMost recent audit log entry:');
      console.log(`  Action: ${latest.action}`);
      console.log(`  Status: ${latest.status}`);
      console.log(
        `  User: ${
          latest.userId
            ? `${latest.userId.name} (${latest.userId.email})`
            : 'Unknown'
        }`
      );
      console.log(`  Timestamp: ${latest.timestamp}`);
    }
  } catch (error) {
    console.error(
      'Error connecting to MongoDB or querying data:',
      error.message
    );
    console.error('Please make sure:');
    console.error('1. Your MongoDB server is running');
    console.error('2. Your MONGO_URI environment variable is correct');
    console.error('3. You have network connectivity to your database');
  } finally {
    // Close the connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the function
countAuditLogs();
