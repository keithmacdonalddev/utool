/**
 * Migration Script: Enhanced Project Schema
 *
 * This script migrates existing projects to the new enhanced schema
 * while preserving all existing data and maintaining backward compatibility.
 *
 * SAFE TO RUN MULTIPLE TIMES - Idempotent operations
 * INCLUDES DRY-RUN MODE - Test without making changes
 * INCLUDES ROLLBACK CAPABILITY - Restore from backup if needed
 *
 * Migration steps:
 * 1. Migrate timeline fields (startDate -> timeline.startDate, endDate -> timeline.targetEndDate)
 * 2. Initialize new fields with intelligent defaults
 * 3. Set up default kanban columns based on project type
 * 4. Initialize progress tracking
 * 5. Set up activity tracking
 * 6. Ensure member permissions are set correctly
 *
 * Usage:
 *   node server/scripts/migrateProjectsToEnhancedSchema.js
 *   node server/scripts/migrateProjectsToEnhancedSchema.js --dry-run
 *   node server/scripts/migrateProjectsToEnhancedSchema.js --rollback
 */

import mongoose from 'mongoose';
import Project from '../models/Project.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');
const shouldRollback = process.argv.includes('--rollback');

// Migration constants
const MIGRATION_BATCH_SIZE = 10; // Optimal for memory usage vs performance
const BACKUP_DIR = './migration-backups';
const BACKUP_FILE = path.join(BACKUP_DIR, `projects-backup-${Date.now()}.json`);

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/utool'
    );
    console.log('✅ Connected to MongoDB for migration');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Create backup of all projects before migration
 */
async function createBackup() {
  try {
    console.log('📦 Creating backup...');

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Get all projects
    const projects = await Project.find({}).lean();

    // Save backup
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(projects, null, 2));

    console.log(`✅ Backup created: ${BACKUP_FILE}`);
    return BACKUP_FILE;
  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    throw error;
  }
}

/**
 * Restore from backup
 */
async function restoreFromBackup() {
  try {
    // Find the most recent backup
    const backupFiles = fs
      .readdirSync(BACKUP_DIR)
      .filter((file) => file.startsWith('projects-backup-'))
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      throw new Error('No backup files found');
    }

    const latestBackup = path.join(BACKUP_DIR, backupFiles[0]);
    console.log(`🔄 Restoring from backup: ${latestBackup}`);

    // Read backup data
    const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));

    // Start transaction for rollback
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Delete all current projects
        await Project.deleteMany({}, { session });

        // Restore from backup
        if (backupData.length > 0) {
          await Project.insertMany(backupData, { session });
        }
      });

      console.log(`✅ Restored ${backupData.length} projects from backup`);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

/**
 * Get intelligent defaults based on existing project data
 */
function getIntelligentDefaults(project) {
  // Determine project category based on name/description keywords
  const content = `${project.name} ${project.description || ''}`.toLowerCase();
  let category = 'other';

  if (
    content.includes('develop') ||
    content.includes('code') ||
    content.includes('software') ||
    content.includes('app')
  ) {
    category = 'development';
  } else if (
    content.includes('market') ||
    content.includes('campaign') ||
    content.includes('brand')
  ) {
    category = 'marketing';
  } else if (
    content.includes('design') ||
    content.includes('ui') ||
    content.includes('ux')
  ) {
    category = 'design';
  } else if (
    content.includes('research') ||
    content.includes('study') ||
    content.includes('analysis')
  ) {
    category = 'research';
  } else if (
    content.includes('operation') ||
    content.includes('process') ||
    content.includes('workflow')
  ) {
    category = 'operations';
  }

  // Default kanban columns based on category
  const kanbanColumns = {
    development: [
      { id: 'backlog', name: 'Backlog', color: '#6B7280', order: 0 },
      { id: 'todo', name: 'To Do', color: '#3B82F6', order: 1 },
      { id: 'in-progress', name: 'In Progress', color: '#F59E0B', order: 2 },
      { id: 'review', name: 'Review', color: '#8B5CF6', order: 3 },
      { id: 'done', name: 'Done', color: '#10B981', order: 4 },
    ],
    marketing: [
      { id: 'ideas', name: 'Ideas', color: '#6B7280', order: 0 },
      { id: 'planning', name: 'Planning', color: '#3B82F6', order: 1 },
      { id: 'in-progress', name: 'In Progress', color: '#F59E0B', order: 2 },
      { id: 'completed', name: 'Completed', color: '#10B981', order: 3 },
    ],
    default: [
      { id: 'todo', name: 'To Do', color: '#3B82F6', order: 0 },
      { id: 'in-progress', name: 'In Progress', color: '#F59E0B', order: 1 },
      { id: 'done', name: 'Done', color: '#10B981', order: 2 },
    ],
  };

  return {
    category,
    kanbanColumns: kanbanColumns[category] || kanbanColumns.default,
    color:
      category === 'development'
        ? '#3B82F6'
        : category === 'marketing'
        ? '#EF4444'
        : category === 'design'
        ? '#8B5CF6'
        : '#3B82F6',
    icon:
      category === 'development'
        ? 'code'
        : category === 'marketing'
        ? 'megaphone'
        : category === 'design'
        ? 'palette'
        : category === 'research'
        ? 'search'
        : 'folder',
  };
}

/**
 * Migrate a single project to the enhanced schema
 */
async function migrateProject(project, session = null) {
  const updates = {};
  let hasUpdates = false;

  // 1. Migrate timeline fields
  if (project.startDate && !project.timeline?.startDate) {
    updates['timeline.startDate'] = project.startDate;
    hasUpdates = true;
  }

  if (project.endDate && !project.timeline?.targetEndDate) {
    updates['timeline.targetEndDate'] = project.endDate;
    hasUpdates = true;
  }

  // 2. Initialize progress tracking if not exists
  if (!project.progress) {
    updates['progress'] = {
      percentage: 0,
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        inProgressTasks: 0,
      },
      lastCalculated: new Date(),
    };
    hasUpdates = true;
  }

  // 3. Initialize activity tracking if not exists
  if (!project.activity) {
    updates['activity'] = {
      lastActivityAt: project.updatedAt || project.createdAt || new Date(),
      totalActivities: 0,
    };
    hasUpdates = true;
  }

  // 4. Set up intelligent defaults
  const defaults = getIntelligentDefaults(project);

  if (!project.category) {
    updates['category'] = defaults.category;
    hasUpdates = true;
  }

  // 5. Initialize features if not exists
  if (!project.features) {
    updates['features'] = {
      tasks: {
        enabled: true,
        settings: { defaultView: 'list', customStatuses: [] },
      },
      documents: { enabled: true, settings: {} },
      budget: { enabled: false, settings: { currency: 'USD' } },
    };
    hasUpdates = true;
  }

  // 6. Initialize settings if not exists
  if (!project.settings) {
    updates['settings'] = {
      defaultView: 'overview',
      notifications: {
        emailDigest: 'weekly',
        taskReminders: true,
        memberUpdates: true,
      },
      kanbanColumns: defaults.kanbanColumns,
      color: defaults.color,
      icon: defaults.icon,
    };
    hasUpdates = true;
  } else if (
    !project.settings.kanbanColumns ||
    project.settings.kanbanColumns.length === 0
  ) {
    updates['settings.kanbanColumns'] = defaults.kanbanColumns;
    hasUpdates = true;
  }

  // 7. Initialize metadata if not exists
  if (!project.metadata) {
    updates['metadata'] = {
      version: 1,
      source: 'web',
      customFields: new Map(),
    };
    hasUpdates = true;
  }

  // 8. Update member structure to include granular permissions
  if (project.members && project.members.length > 0) {
    const updatedMembers = project.members.map((member) => {
      // If member is just an ObjectId (old format), convert to new format
      if (
        typeof member === 'string' ||
        member.constructor.name === 'ObjectId'
      ) {
        return {
          user: member,
          role: 'contributor',
          permissions: {
            canEditProject: false,
            canDeleteProject: false,
            canManageMembers: false,
            canManageTasks: true,
            canViewAnalytics: false,
            canExportData: false,
          },
          joinedAt: project.createdAt || new Date(),
        };
      }

      // If member already has new structure, but missing permissions
      if (!member.permissions) {
        const rolePermissions = {
          admin: {
            canEditProject: true,
            canDeleteProject: true,
            canManageMembers: true,
            canManageTasks: true,
            canViewAnalytics: true,
            canExportData: true,
          },
          editor: {
            canEditProject: true,
            canDeleteProject: false,
            canManageMembers: false,
            canManageTasks: true,
            canViewAnalytics: true,
            canExportData: false,
          },
          contributor: {
            canEditProject: false,
            canDeleteProject: false,
            canManageMembers: false,
            canManageTasks: true,
            canViewAnalytics: false,
            canExportData: false,
          },
          viewer: {
            canEditProject: false,
            canDeleteProject: false,
            canManageMembers: false,
            canManageTasks: false,
            canViewAnalytics: false,
            canExportData: false,
          },
        };

        return {
          ...member,
          role: member.role || 'contributor',
          permissions: rolePermissions[member.role || 'contributor'],
          joinedAt: member.joinedAt || project.createdAt || new Date(),
        };
      }

      return member;
    });

    updates['members'] = updatedMembers;
    hasUpdates = true;
  }

  // 9. Set default visibility and template flags
  if (!project.visibility) {
    updates['visibility'] = 'team';
    hasUpdates = true;
  }

  if (project.isTemplate === undefined) {
    updates['isTemplate'] = false;
    hasUpdates = true;
  }

  // Only update if there are changes and not in dry-run mode
  if (hasUpdates && !isDryRun) {
    const updateOptions = { new: true };
    if (session) {
      updateOptions.session = session;
    }

    await Project.findByIdAndUpdate(
      project._id,
      { $set: updates },
      updateOptions
    );
    return true;
  }

  return hasUpdates; // Return true even in dry-run if updates would be made
}

/**
 * Main migration function
 */
async function runMigration() {
  if (isDryRun) {
    console.log('🧪 RUNNING IN DRY-RUN MODE - No changes will be made\n');
  } else {
    console.log('🚀 Starting Project Schema Migration...\n');
  }

  try {
    // Get all projects
    const projects = await Project.find({}).lean();
    console.log(`📊 Found ${projects.length} projects to migrate\n`);

    if (projects.length === 0) {
      console.log('✅ No projects found. Migration complete!');
      return;
    }

    // Create backup before migration (unless it's a dry run or rollback)
    if (!isDryRun && !shouldRollback) {
      await createBackup();
    }

    let migratedCount = 0;
    let skippedCount = 0;

    // Process projects in batches with transactions
    for (let i = 0; i < projects.length; i += MIGRATION_BATCH_SIZE) {
      const batch = projects.slice(i, i + MIGRATION_BATCH_SIZE);

      console.log(
        `📦 Processing batch ${
          Math.floor(i / MIGRATION_BATCH_SIZE) + 1
        }/${Math.ceil(projects.length / MIGRATION_BATCH_SIZE)}...`
      );

      // Use transaction for batch processing (unless in dry-run mode)
      if (isDryRun) {
        // Dry-run mode: just simulate the migration
        const batchPromises = batch.map(async (project) => {
          try {
            const wouldUpdate = await migrateProject(project);
            if (wouldUpdate) {
              console.log(
                `  🧪 Would migrate: ${project.name} (${project._id})`
              );
              return 'would-migrate';
            } else {
              console.log(
                `  ⏭️  Would skip: ${project.name} (already migrated)`
              );
              return 'would-skip';
            }
          } catch (error) {
            console.error(
              `  ❌ Error analyzing ${project.name}:`,
              error.message
            );
            return 'error';
          }
        });

        const results = await Promise.all(batchPromises);
        migratedCount += results.filter((r) => r === 'would-migrate').length;
        skippedCount += results.filter((r) => r === 'would-skip').length;
      } else {
        // Actual migration with transaction
        const session = await mongoose.startSession();

        try {
          await session.withTransaction(async () => {
            const batchPromises = batch.map(async (project) => {
              try {
                const wasUpdated = await migrateProject(project, session);
                if (wasUpdated) {
                  console.log(
                    `  ✅ Migrated: ${project.name} (${project._id})`
                  );
                  return 'migrated';
                } else {
                  console.log(
                    `  ⏭️  Skipped: ${project.name} (already migrated)`
                  );
                  return 'skipped';
                }
              } catch (error) {
                console.error(
                  `  ❌ Error migrating ${project.name}:`,
                  error.message
                );
                throw error; // Fail the entire transaction
              }
            });

            const results = await Promise.all(batchPromises);
            const batchMigrated = results.filter(
              (r) => r === 'migrated'
            ).length;
            const batchSkipped = results.filter((r) => r === 'skipped').length;

            migratedCount += batchMigrated;
            skippedCount += batchSkipped;
          });
        } finally {
          await session.endSession();
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + MIGRATION_BATCH_SIZE < projects.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log('\n📈 Migration Summary:');
    if (isDryRun) {
      console.log(`  🧪 Would migrate: ${migratedCount} projects`);
      console.log(`  ⏭️  Would skip: ${skippedCount} projects`);
    } else {
      console.log(`  ✅ Migrated: ${migratedCount} projects`);
      console.log(`  ⏭️  Skipped: ${skippedCount} projects`);
    }
    console.log(`  📊 Total: ${projects.length} projects`);

    if (isDryRun) {
      console.log('\n🧪 DRY-RUN COMPLETE - No actual changes were made');
      console.log('Run without --dry-run flag to perform the actual migration');
    } else {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📝 What was migrated:');
      console.log(
        '  • Timeline fields (startDate/endDate → timeline structure)'
      );
      console.log('  • Progress tracking initialization');
      console.log('  • Activity tracking setup');
      console.log('  • Intelligent category assignment');
      console.log('  • Default kanban columns by project type');
      console.log('  • Member permission structure');
      console.log('  • Feature flags and settings');
      console.log('  • Metadata initialization');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Verify migration success
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  const projectsWithoutProgress = await Project.countDocuments({
    progress: { $exists: false },
  });
  const projectsWithoutActivity = await Project.countDocuments({
    activity: { $exists: false },
  });
  const projectsWithoutSettings = await Project.countDocuments({
    settings: { $exists: false },
  });
  const projectsWithoutMetadata = await Project.countDocuments({
    metadata: { $exists: false },
  });

  console.log('📊 Verification Results:');
  console.log(`  • Projects missing progress: ${projectsWithoutProgress}`);
  console.log(`  • Projects missing activity: ${projectsWithoutActivity}`);
  console.log(`  • Projects missing settings: ${projectsWithoutSettings}`);
  console.log(`  • Projects missing metadata: ${projectsWithoutMetadata}`);

  const issues =
    projectsWithoutProgress +
    projectsWithoutActivity +
    projectsWithoutSettings +
    projectsWithoutMetadata;

  if (issues === 0) {
    console.log('✅ Migration verification passed!');
  } else {
    console.log(
      `⚠️  Found ${issues} potential issues. Consider re-running migration.`
    );
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await connectDB();

    if (shouldRollback) {
      console.log('🔄 Starting rollback process...\n');
      await restoreFromBackup();
      console.log('\n✅ Rollback completed successfully!');
    } else {
      await runMigration();
      if (!isDryRun) {
        await verifyMigration();
      }
    }
  } catch (error) {
    console.error('💥 Migration script failed:', error);

    if (!isDryRun && !shouldRollback) {
      console.log('\n🚨 Migration failed! Consider running rollback:');
      console.log(
        'node server/scripts/migrateProjectsToEnhancedSchema.js --rollback'
      );
    }

    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Display usage information if no valid arguments
  if (process.argv.length > 2 && !isDryRun && !shouldRollback) {
    console.log('📖 Usage:');
    console.log(
      '  node server/scripts/migrateProjectsToEnhancedSchema.js           # Run migration'
    );
    console.log(
      '  node server/scripts/migrateProjectsToEnhancedSchema.js --dry-run # Test migration'
    );
    console.log(
      '  node server/scripts/migrateProjectsToEnhancedSchema.js --rollback # Restore from backup'
    );
    process.exit(0);
  }

  main();
}

export { runMigration, verifyMigration };
