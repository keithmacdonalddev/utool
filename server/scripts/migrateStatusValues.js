#!/usr/bin/env node
/**
 * Data Migration Script: Standardize Project Status and Priority Values
 *
 * This script migrates existing projects from the old capitalized format
 * to the new standardized lowercase-hyphen format.
 *
 * Migration mapping:
 * Status: 'Planning' → 'planning', 'Active' → 'active', 'On Hold' → 'on-hold', etc.
 * Priority: 'Low' → 'low', 'Medium' → 'medium', 'High' → 'high'
 *
 * Usage: node server/scripts/migrateStatusValues.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Status mapping from old to new format
const STATUS_MAPPING = {
  Planning: 'planning',
  Active: 'active',
  'On Hold': 'on-hold',
  Completed: 'completed',
  Archived: 'archived',
};

// Priority mapping from old to new format
const PRIORITY_MAPPING = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/utool'
    );
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Get projects collection directly (bypassing schema validation)
 */
function getProjectsCollection() {
  return mongoose.connection.db.collection('projects');
}

/**
 * Migrate project status and priority values
 */
async function migrateStatusValues() {
  const projectsCollection = getProjectsCollection();

  console.log('\n📊 Starting status and priority migration...');

  // Get all projects that need migration
  const projectsToMigrate = await projectsCollection
    .find({
      $or: [
        { status: { $in: Object.keys(STATUS_MAPPING) } },
        { priority: { $in: Object.keys(PRIORITY_MAPPING) } },
      ],
    })
    .toArray();

  console.log(
    `📋 Found ${projectsToMigrate.length} projects that need migration`
  );

  if (projectsToMigrate.length === 0) {
    console.log('✅ No projects need migration');
    return;
  }

  let statusMigrated = 0;
  let priorityMigrated = 0;
  let errors = 0;

  // Process each project
  for (const project of projectsToMigrate) {
    try {
      const updates = {};

      // Migrate status if needed
      if (project.status && STATUS_MAPPING[project.status]) {
        updates.status = STATUS_MAPPING[project.status];
        statusMigrated++;
        console.log(
          `  📝 Project "${project.name}": status "${project.status}" → "${updates.status}"`
        );
      }

      // Migrate priority if needed
      if (project.priority && PRIORITY_MAPPING[project.priority]) {
        updates.priority = PRIORITY_MAPPING[project.priority];
        priorityMigrated++;
        console.log(
          `  📝 Project "${project.name}": priority "${project.priority}" → "${updates.priority}"`
        );
      }

      // Update the project if we have any changes
      if (Object.keys(updates).length > 0) {
        await projectsCollection.updateOne(
          { _id: project._id },
          {
            $set: {
              ...updates,
              updatedAt: new Date(), // Update the timestamp
            },
          }
        );
      }
    } catch (error) {
      console.error(
        `❌ Error migrating project "${project.name}":`,
        error.message
      );
      errors++;
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Status values migrated: ${statusMigrated}`);
  console.log(`  ✅ Priority values migrated: ${priorityMigrated}`);
  console.log(`  ❌ Errors encountered: ${errors}`);

  if (errors === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log(
      `\n⚠️  Migration completed with ${errors} errors. Please review the logs above.`
    );
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  const projectsCollection = getProjectsCollection();

  console.log('\n🔍 Verifying migration results...');

  // Check for any remaining old format values
  const remainingOldStatus = await projectsCollection.countDocuments({
    status: { $in: Object.keys(STATUS_MAPPING) },
  });

  const remainingOldPriority = await projectsCollection.countDocuments({
    priority: { $in: Object.keys(PRIORITY_MAPPING) },
  });

  // Check new format counts
  const newStatusCount = await projectsCollection.countDocuments({
    status: { $in: Object.values(STATUS_MAPPING) },
  });

  const newPriorityCount = await projectsCollection.countDocuments({
    priority: { $in: Object.values(PRIORITY_MAPPING) },
  });

  console.log('\n📈 Verification Results:');
  console.log(`  Old status format remaining: ${remainingOldStatus}`);
  console.log(`  Old priority format remaining: ${remainingOldPriority}`);
  console.log(`  New status format count: ${newStatusCount}`);
  console.log(`  New priority format count: ${newPriorityCount}`);

  if (remainingOldStatus === 0 && remainingOldPriority === 0) {
    console.log(
      '\n✅ Verification passed! All values have been migrated successfully.'
    );
  } else {
    console.log(
      '\n⚠️  Verification found remaining old format values. Migration may need to be run again.'
    );
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Project Status & Priority Migration');
    console.log('='.repeat(50));

    await connectDB();
    await migrateStatusValues();
    await verifyMigration();

    console.log('\n' + '='.repeat(50));
    console.log('🏁 Migration script completed');
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\n🔐 Database connection closed');
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration };
