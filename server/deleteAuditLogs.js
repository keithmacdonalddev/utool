/**
 * Script to delete AuditLog entries from the database
 * This script includes confirmation prompts and options for selective deletion
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';
import AuditLog from './models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask questions
const askQuestion = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function deleteAuditLogs() {
  // Get MongoDB connection string from env vars
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error('Error: MONGO_URI environment variable is not defined');
    console.log(
      'Please make sure your .env file exists and contains MONGO_URI'
    );
    rl.close();
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

    if (totalCount === 0) {
      console.log('No audit logs to delete.');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    console.log('DELETION OPTIONS:');
    console.log('1. Delete ALL audit logs');
    console.log('2. Delete audit logs by action type');
    console.log('3. Delete audit logs by date range');
    console.log('4. Cancel (do not delete anything)');

    const option = await askQuestion('\nEnter your choice (1-4): ');

    let filter = {};
    let confirmMessage = '';

    switch (option) {
      case '1':
        // Delete all logs
        confirmMessage = `Are you sure you want to delete ALL ${totalCount} audit logs? This action cannot be undone. (yes/no): `;
        break;

      case '2':
        // Delete by action type
        // Get available action types
        const actions = await AuditLog.distinct('action');
        console.log('\nAvailable action types:');
        actions.forEach((action, index) => {
          console.log(`${index + 1}. ${action}`);
        });

        const actionIndex = await askQuestion(
          '\nEnter the number of the action type to delete: '
        );
        if (actionIndex < 1 || actionIndex > actions.length) {
          console.log('Invalid selection. Operation cancelled.');
          rl.close();
          await mongoose.disconnect();
          return;
        }

        const selectedAction = actions[actionIndex - 1];
        filter = { action: selectedAction };
        const actionCount = await AuditLog.countDocuments(filter);

        confirmMessage = `Are you sure you want to delete all ${actionCount} logs with action "${selectedAction}"? This action cannot be undone. (yes/no): `;
        break;

      case '3':
        // Delete by date range
        console.log('\nEnter date range (format: YYYY-MM-DD)');
        const startDateStr = await askQuestion('Start date: ');
        const endDateStr = await askQuestion('End date: ');

        try {
          const startDate = new Date(startDateStr);
          // Set end date to the end of the specified day
          const endDate = new Date(endDateStr);
          endDate.setHours(23, 59, 59, 999);

          filter = {
            timestamp: {
              $gte: startDate,
              $lte: endDate,
            },
          };

          const dateRangeCount = await AuditLog.countDocuments(filter);
          confirmMessage = `Are you sure you want to delete ${dateRangeCount} logs from ${
            startDate.toISOString().split('T')[0]
          } to ${
            endDate.toISOString().split('T')[0]
          }? This action cannot be undone. (yes/no): `;
        } catch (err) {
          console.log('Invalid date format. Operation cancelled.');
          rl.close();
          await mongoose.disconnect();
          return;
        }
        break;

      case '4':
      default:
        console.log('Operation cancelled. No logs were deleted.');
        rl.close();
        await mongoose.disconnect();
        return;
    }

    // Final confirmation
    const confirmation = await askQuestion(confirmMessage);

    if (confirmation.toLowerCase() === 'yes') {
      console.log('\nDeleting audit logs...');
      const result = await AuditLog.deleteMany(filter);
      console.log(
        `\n✅ Successfully deleted ${result.deletedCount} audit log entries.`
      );
    } else {
      console.log('\nDeletion cancelled. No logs were deleted.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close readline interface and database connection
    rl.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the function
deleteAuditLogs();
