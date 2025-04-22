// filepath: c:\Users\macdo\Documents\Cline\mern-productivity-app\server\scripts\migrateOrphanedTasks.js
/**
 * Migration Script: Orphaned Tasks to Default Project
 *
 * This script identifies tasks without project associations and assigns them to
 * a default project. It's part of the architectural change to make all tasks
 * project-based.
 *
 * Features:
 * - Creates a default project if needed
 * - Migrates orphaned tasks to the default project
 * - Provides detailed logging and statistics
 * - Can be run as a standalone script or via API endpoint
 * - Includes rollback capability
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicitly set path to .env file (looking in parent directory - server root)
const envPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

// Check if .env exists in server directory or root directory
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else if (fs.existsSync(rootEnvPath)) {
  console.log(`Loading environment from ${rootEnvPath}`);
  dotenv.config({ path: rootEnvPath });
} else {
  console.warn('No .env file found, using environment variables directly');
  dotenv.config();
}

// Import models after dotenv config
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs/migrations');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger for migration activities
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(
    path.join(logsDir, 'orphaned-tasks-migration.log'),
    logEntry
  );
  console.log(message);
};

/**
 * Main migration function
 * @param {Object} options - Configuration options for migration
 * @param {string} options.adminUserId - ID of admin user to own default project
 * @param {string} options.defaultProjectName - Name for default project (default: "Default Project")
 * @param {boolean} options.dryRun - If true, only report what would be done without making changes
 * @param {string} options.mongoUri - Optional MongoDB connection URI (overrides env variable)
 * @returns {Object} Migration statistics and results
 */
export const migrateOrphanedTasks = async (options = {}) => {
  const {
    adminUserId,
    defaultProjectName = 'Default Project',
    dryRun = false,
    mongoUri = process.env.MONGO_URI,
  } = options;

  // Statistics object for reporting
  const stats = {
    orphanedTasksCount: 0,
    migratedTasksCount: 0,
    createdDefaultProject: false,
    defaultProjectId: null,
    errors: [],
    taskIds: [],
    startTime: new Date(),
    endTime: null,
    dryRun,
  };

  try {
    // Validate MongoDB URI
    if (!mongoUri) {
      throw new Error(
        'MongoDB URI is not defined. Set MONGO_URI environment variable or pass it as an option.'
      );
    }

    // Connect to MongoDB if running as standalone script
    if (!mongoose.connection.readyState) {
      logToFile('Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      logToFile('Connected to MongoDB');
    }

    // Start migration process
    logToFile(`Starting orphaned tasks migration ${dryRun ? '(DRY RUN)' : ''}`);

    // Find admin user if not provided
    let adminId = adminUserId;
    if (!adminId) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        adminId = adminUser._id;
        logToFile(`Found admin user: ${adminId}`);
      } else {
        // Get any user as a fallback
        const anyUser = await User.findOne({});
        if (anyUser) {
          adminId = anyUser._id;
          logToFile(`No admin found. Using user: ${adminId} as fallback`);
        } else {
          throw new Error('No users found in the system');
        }
      }
    }

    // Find or create default project
    let defaultProject = await Project.findOne({ name: defaultProjectName });

    if (!defaultProject) {
      if (dryRun) {
        logToFile(
          `[DRY RUN] Would create default project: "${defaultProjectName}"`
        );
        stats.createdDefaultProject = true;
        // Create a temporary ID for reporting
        stats.defaultProjectId = 'temp-id-for-dry-run';
      } else {
        logToFile(`Creating default project: "${defaultProjectName}"`);
        defaultProject = await Project.create({
          name: defaultProjectName,
          description: 'Default project for previously unassociated tasks',
          owner: adminId,
          members: [adminId],
          createdAt: new Date(),
        });
        stats.createdDefaultProject = true;
        stats.defaultProjectId = defaultProject._id;
        logToFile(`Created default project with ID: ${defaultProject._id}`);
      }
    } else {
      stats.defaultProjectId = defaultProject._id;
      logToFile(
        `Using existing default project: "${defaultProjectName}" (${defaultProject._id})`
      );
    }

    // Find tasks with no project field
    const orphanedTasks = await Task.find({ project: { $exists: false } });
    stats.orphanedTasksCount = orphanedTasks.length;

    logToFile(`Found ${orphanedTasks.length} orphaned tasks`);

    // Nothing to do if no orphaned tasks
    if (orphanedTasks.length === 0) {
      logToFile('No orphaned tasks found, migration complete');
      stats.endTime = new Date();
      return stats;
    }

    // Create backup before modifying tasks
    if (!dryRun) {
      const backupPath = path.join(
        logsDir,
        `orphaned-tasks-backup-${Date.now()}.json`
      );
      logToFile(`Creating backup of orphaned tasks at: ${backupPath}`);
      fs.writeFileSync(backupPath, JSON.stringify(orphanedTasks, null, 2));
    }

    // Process each orphaned task
    for (const task of orphanedTasks) {
      try {
        if (dryRun) {
          logToFile(
            `[DRY RUN] Would assign task "${task.title}" (${task._id}) to default project`
          );
        } else {
          // Update the task with project reference
          await Task.updateOne(
            { _id: task._id },
            { $set: { project: defaultProject._id } }
          );

          logToFile(
            `Assigned task "${task.title}" (${task._id}) to default project`
          );
        }

        stats.taskIds.push(task._id);
        stats.migratedTasksCount++;
      } catch (error) {
        const errorMsg = `Error processing task ${task._id}: ${error.message}`;
        logToFile(`ERROR: ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    // Verify migration if not in dry run mode
    if (!dryRun) {
      const remainingOrphans = await Task.countDocuments({
        project: { $exists: false },
      });
      if (remainingOrphans > 0) {
        const warning = `Warning: ${remainingOrphans} tasks still have no project after migration`;
        logToFile(warning);
        stats.errors.push(warning);
      } else {
        logToFile(
          'Verification successful: All tasks now have project associations'
        );
      }
    }

    // Complete migration
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;

    logToFile(
      `Migration ${dryRun ? 'dry run ' : ''}completed in ${duration.toFixed(
        2
      )} seconds`
    );
    logToFile(
      `Results: ${stats.migratedTasksCount} of ${stats.orphanedTasksCount} tasks processed`
    );

    if (stats.errors.length > 0) {
      logToFile(`Encountered ${stats.errors.length} errors during migration`);
    }

    return stats;
  } catch (error) {
    const errorMsg = `Migration failed: ${error.message}`;
    logToFile(`CRITICAL ERROR: ${errorMsg}`);
    stats.errors.push(errorMsg);
    stats.endTime = new Date();
    return stats;
  } finally {
    // Close connection if we opened it
    if (
      mongoose.connection.readyState &&
      mongoose.connection.client &&
      !mongoose.connection.client.topology?.s?.everConnected
    ) {
      await mongoose.connection.close();
      logToFile('Closed MongoDB connection');
    }
  }
};

/**
 * Display usage instructions
 */
function showUsage() {
  console.log(`
Usage: node migrateOrphanedTasks.js [options]

Options:
  --dry-run              Simulate migration without making changes
  --rollback <file>      Rollback changes using specified backup file
  --mongo-uri <uri>      MongoDB connection URI (overrides .env)
  --project <name>       Default project name (default: "Default Project")
  --help                 Show this help message

Examples:
  node migrateOrphanedTasks.js --dry-run
  node migrateOrphanedTasks.js --mongo-uri mongodb://localhost:27017/mydatabase
  node migrateOrphanedTasks.js --rollback ./logs/migrations/orphaned-tasks-backup-1714497823579.json
  `);
}

/**
 * Rollback function to undo migration based on backup file
 * @param {string} backupFilePath - Path to the backup JSON file
 * @param {string} mongoUri - MongoDB connection URI
 * @returns {Object} Rollback statistics
 */
export const rollbackMigration = async (
  backupFilePath,
  mongoUri = process.env.MONGO_URI
) => {
  const stats = {
    restoredCount: 0,
    errors: [],
    startTime: new Date(),
    endTime: null,
  };

  try {
    // Validate MongoDB URI
    if (!mongoUri) {
      throw new Error(
        'MongoDB URI is not defined. Set MONGO_URI environment variable or pass it as an option.'
      );
    }

    // Connect to MongoDB if running as standalone script
    if (!mongoose.connection.readyState) {
      logToFile('Connecting to MongoDB for rollback...');
      await mongoose.connect(mongoUri);
      logToFile('Connected to MongoDB');
    }

    logToFile(`Starting rollback from backup: ${backupFilePath}`);

    // Read backup file
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    logToFile(`Loaded backup with ${backupData.length} tasks`);

    // Process each task in the backup
    for (const taskData of backupData) {
      try {
        // Remove project field from task
        await Task.updateOne(
          { _id: taskData._id },
          { $unset: { project: '' } }
        );

        logToFile(
          `Restored task "${taskData.title}" (${taskData._id}) to original state`
        );
        stats.restoredCount++;
      } catch (error) {
        const errorMsg = `Error rolling back task ${taskData._id}: ${error.message}`;
        logToFile(`ERROR: ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

    // Complete rollback
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;

    logToFile(`Rollback completed in ${duration.toFixed(2)} seconds`);
    logToFile(
      `Results: ${stats.restoredCount} of ${backupData.length} tasks restored`
    );

    if (stats.errors.length > 0) {
      logToFile(`Encountered ${stats.errors.length} errors during rollback`);
    }

    return stats;
  } catch (error) {
    const errorMsg = `Rollback failed: ${error.message}`;
    logToFile(`CRITICAL ERROR: ${errorMsg}`);
    stats.errors.push(errorMsg);
    stats.endTime = new Date();
    return stats;
  }
};

// Execute migration if run directly (not imported)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {
    isDryRun: args.includes('--dry-run'),
    mongoUri: null,
    defaultProjectName: 'Default Project',
    rollback: false,
    backupPath: null,
  };

  // Extract MongoDB URI if provided
  const mongoUriIndex = args.indexOf('--mongo-uri');
  if (mongoUriIndex !== -1 && args.length > mongoUriIndex + 1) {
    options.mongoUri = args[mongoUriIndex + 1];
  }

  // Extract project name if provided
  const projectNameIndex = args.indexOf('--project');
  if (projectNameIndex !== -1 && args.length > projectNameIndex + 1) {
    options.defaultProjectName = args[projectNameIndex + 1];
  }

  // Check for help flag
  if (args.includes('--help')) {
    showUsage();
    process.exit(0);
  }

  // Check for rollback option
  const rollbackIndex = args.indexOf('--rollback');
  if (rollbackIndex !== -1) {
    options.rollback = true;
    if (args.length > rollbackIndex + 1) {
      options.backupPath = args[rollbackIndex + 1];
    } else {
      console.error('Error: Missing backup file path for rollback');
      showUsage();
      process.exit(1);
    }
  }

  // Execute either migration or rollback
  if (options.rollback) {
    rollbackMigration(options.backupPath, options.mongoUri)
      .then((stats) => {
        console.log('Rollback completed:', stats);
        process.exit(0);
      })
      .catch((err) => {
        console.error('Rollback failed:', err);
        process.exit(1);
      });
  } else {
    migrateOrphanedTasks({
      dryRun: options.isDryRun,
      mongoUri: options.mongoUri,
      defaultProjectName: options.defaultProjectName,
    })
      .then((stats) => {
        console.log('Migration completed:', stats);
        process.exit(0);
      })
      .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
      });
  }
}
