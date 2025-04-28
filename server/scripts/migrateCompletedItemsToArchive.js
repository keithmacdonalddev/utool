/**
 * Migration Script: Move Completed Items to Archive
 *
 * This script identifies completed items across the application and moves them to the Archive collection.
 * It processes:
 * 1. Tasks with status 'Completed'
 * 2. Projects with status 'Completed'
 * 3. Notes with the 'archived' flag set to true
 *
 * Usage: node migrateCompletedItemsToArchive.js
 * Optional flags:
 *   --remove: Remove the original items after archiving (default: false)
 *   --dry-run: Just count items to be migrated without actually migrating (default: false)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Note from '../models/Note.js';
import Archive from '../models/Archive.js';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Process command-line arguments
const args = process.argv.slice(2);
const shouldRemove = args.includes('--remove');
const dryRun = args.includes('--dry-run');

/**
 * Connect to MongoDB database
 * @returns {Promise<void>} - A promise that resolves when connected to MongoDB
 */
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI environment variable is not defined');
      process.exit(1);
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Archive a completed task
 * @param {Object} task - The completed task document
 * @returns {Promise<Object>} - The created archive document
 */
const archiveTask = async (task) => {
  try {
    // Calculate completion time if possible
    let completionTime = null;
    if (task.createdAt) {
      completionTime = Date.now() - new Date(task.createdAt).getTime();
    }

    // Create archive entry
    const archiveData = {
      user: task.assignee,
      itemType: 'task',
      originalId: task._id,
      title: task.title,
      description: task.description || '',
      createdAt: task.createdAt,
      completedAt: new Date(),
      completionTime,
      project: task.project,
      priority: task.priority,
      metadata: {
        originalCollection: 'tasks',
        assignee: task.assignee,
        dueDate: task.dueDate,
        estimatedTime: task.estimatedTime,
      },
    };

    if (dryRun) {
      return null;
    }

    const archive = await Archive.create(archiveData);

    // Optionally remove the original task
    if (shouldRemove) {
      await Task.findByIdAndDelete(task._id);
      console.log(`Task ${task._id} removed after archiving`);
    }

    return archive;
  } catch (error) {
    console.error(`Error archiving task ${task._id}:`, error.message);
    return null;
  }
};

/**
 * Archive a completed project
 * @param {Object} project - The completed project document
 * @returns {Promise<Object>} - The created archive document
 */
const archiveProject = async (project) => {
  try {
    // Calculate completion time if possible
    let completionTime = null;
    if (project.createdAt) {
      completionTime = Date.now() - new Date(project.createdAt).getTime();
    }

    // Create archive entry
    const archiveData = {
      user: project.owner,
      itemType: 'project',
      originalId: project._id,
      title: project.name,
      description: project.description || '',
      createdAt: project.createdAt,
      completedAt: new Date(),
      completionTime,
      priority: project.priority,
      metadata: {
        originalCollection: 'projects',
        owner: project.owner,
        members: project.members,
        startDate: project.startDate,
        endDate: project.endDate,
      },
    };

    if (dryRun) {
      return null;
    }

    const archive = await Archive.create(archiveData);

    // Optionally remove the original project
    if (shouldRemove) {
      await Project.findByIdAndDelete(project._id);
      console.log(`Project ${project._id} removed after archiving`);
    }

    return archive;
  } catch (error) {
    console.error(`Error archiving project ${project._id}:`, error.message);
    return null;
  }
};

/**
 * Archive an archived note
 * @param {Object} note - The archived note document
 * @returns {Promise<Object>} - The created archive document
 */
const archiveNote = async (note) => {
  try {
    // Calculate completion time if possible
    let completionTime = null;
    if (note.createdAt) {
      completionTime = Date.now() - new Date(note.createdAt).getTime();
    }

    // Create archive entry
    const archiveData = {
      user: note.user,
      itemType: 'note',
      originalId: note._id,
      title: note.title,
      description: note.content || '',
      createdAt: note.createdAt,
      completedAt: new Date(),
      completionTime,
      metadata: {
        originalCollection: 'notes',
        tags: note.tags,
        color: note.color,
      },
    };

    if (dryRun) {
      return null;
    }

    const archive = await Archive.create(archiveData);

    // Optionally remove the original note
    if (shouldRemove) {
      await Note.findByIdAndDelete(note._id);
      console.log(`Note ${note._id} removed after archiving`);
    }

    return archive;
  } catch (error) {
    console.error(`Error archiving note ${note._id}:`, error.message);
    return null;
  }
};

/**
 * Check if an item is already archived
 * @param {string} itemId - The original ID of the item
 * @param {string} itemType - The type of the item
 * @returns {Promise<boolean>} - True if already archived, false otherwise
 */
const isAlreadyArchived = async (itemId, itemType) => {
  const existingArchive = await Archive.findOne({
    originalId: itemId,
    itemType: itemType,
  });

  return existingArchive !== null;
};

/**
 * Main migration function to process all completed items
 * @returns {Promise<void>} - A promise that resolves when migration is complete
 */
const migrateCompletedItems = async () => {
  try {
    // Find completed tasks
    const completedTasks = await Task.find({ status: 'Completed' });
    console.log(`Found ${completedTasks.length} completed tasks`);

    // Find completed projects
    const completedProjects = await Project.find({ status: 'Completed' });
    console.log(`Found ${completedProjects.length} completed projects`);

    // Find archived notes
    const archivedNotes = await Note.find({ archived: true });
    console.log(`Found ${archivedNotes.length} archived notes`);

    // Calculate total items to migrate
    const totalItems =
      completedTasks.length + completedProjects.length + archivedNotes.length;
    console.log(`Total items to check: ${totalItems}`);

    if (dryRun) {
      console.log('Dry run complete. No items were archived.');
      return;
    }

    let archivedCount = 0;
    let alreadyArchivedCount = 0;
    let errorCount = 0;

    // Process tasks
    console.log('\nProcessing tasks...');
    for (const task of completedTasks) {
      if (await isAlreadyArchived(task._id, 'task')) {
        alreadyArchivedCount++;
        continue;
      }

      const archive = await archiveTask(task);
      if (archive) {
        archivedCount++;
        console.log(`Archived task: ${task.title} (${task._id})`);
      } else {
        errorCount++;
      }
    }

    // Process projects
    console.log('\nProcessing projects...');
    for (const project of completedProjects) {
      if (await isAlreadyArchived(project._id, 'project')) {
        alreadyArchivedCount++;
        continue;
      }

      const archive = await archiveProject(project);
      if (archive) {
        archivedCount++;
        console.log(`Archived project: ${project.name} (${project._id})`);
      } else {
        errorCount++;
      }
    }

    // Process notes
    console.log('\nProcessing notes...');
    for (const note of archivedNotes) {
      if (await isAlreadyArchived(note._id, 'note')) {
        alreadyArchivedCount++;
        continue;
      }

      const archive = await archiveNote(note);
      if (archive) {
        archivedCount++;
        console.log(`Archived note: ${note.title} (${note._id})`);
      } else {
        errorCount++;
      }
    }

    // Print summary
    console.log('\nMigration Summary:');
    console.log(`- Total items checked: ${totalItems}`);
    console.log(`- New items archived: ${archivedCount}`);
    console.log(`- Already archived items: ${alreadyArchivedCount}`);
    console.log(`- Errors: ${errorCount}`);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
};

// Main execution
(async () => {
  console.log('Starting migration of completed items to Archive...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'ACTUAL MIGRATION'}`);
  console.log(`Remove after archive: ${shouldRemove ? 'YES' : 'NO'}`);

  await connectDB();
  await migrateCompletedItems();

  console.log('Migration completed!');
  process.exit(0);
})();
