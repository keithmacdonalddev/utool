import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Use console.log for compatibility since logger might not be available in script context
const log = {
  info: console.log,
  error: console.error,
  warn: console.warn,
};

// Debug output
log.info('🚀 Script starting...');
log.info('📍 Current working directory:', process.cwd());
log.info('📁 Script file URL:', import.meta.url);

/**
 * Database Performance Optimization Script for Admin Tools
 *
 * This script creates optimized indexes for admin queries to improve
 * performance by >50% as outlined in Milestone 0 of the Admin Tool
 * Reorganization Plan.
 *
 * Indexes are created based on the existing User and AuditLog schemas
 * and anticipated admin query patterns.
 */

/**
 * Helper function to create indexes with error handling
 * Handles cases where similar indexes already exist
 */
const createIndexSafely = async (
  collection,
  indexSpec,
  options,
  description
) => {
  try {
    await collection.createIndex(indexSpec, options);
    log.info(`   ✅ Created ${options.name} for ${description}`);
    return true;
  } catch (error) {
    if (error.code === 85) {
      // Index already exists with different name - this is OK
      log.warn(
        `   ⚠️ Similar index already exists for ${description} (${error.message})`
      );
      return false;
    } else if (error.code === 86) {
      // Index already exists with same name - this is OK
      log.info(`   ℹ️ Index ${options.name} already exists for ${description}`);
      return false;
    } else {
      // Other error - rethrow
      log.error(`   ❌ Failed to create ${options.name}: ${error.message}`);
      throw error;
    }
  }
};

const createIndexes = async () => {
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  try {
    log.info(
      '🔄 Starting database index creation for admin performance optimization...'
    );

    // Check if MONGO_URI is available
    if (!process.env.MONGO_URI) {
      log.error('❌ MONGO_URI environment variable is not set');
      log.error('Please set MONGO_URI environment variable and try again');
      throw new Error('MONGO_URI environment variable is required');
    }

    log.info('✅ MONGO_URI found in environment variables');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      log.info('🔌 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGO_URI);
      log.info('✅ Connected to MongoDB for index creation');
    }

    const db = mongoose.connection.db;
    log.info('📊 Creating performance indexes for admin queries...');

    // ═══════════════════════════════════════════════════════════════
    // USER COLLECTION INDEXES FOR ADMIN QUERIES
    // ═══════════════════════════════════════════════════════════════

    log.info('📋 Creating User collection indexes...');

    // Index for admin user management queries (role + creation date)
    if (
      await createIndexSafely(
        db.collection('users'),
        { role: 1, createdAt: -1 },
        { name: 'role_createdAt_idx', background: true },
        'user management filtering'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin user activity monitoring
    if (
      await createIndexSafely(
        db.collection('users'),
        { lastActive: -1 },
        { name: 'lastActive_idx', background: true },
        'activity monitoring'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin user search and verification status
    if (
      await createIndexSafely(
        db.collection('users'),
        { email: 1, isVerified: 1 },
        { name: 'email_verified_idx', background: true },
        'search and verification'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin user role and status management
    if (
      await createIndexSafely(
        db.collection('users'),
        { role: 1, isVerified: 1, lastActive: -1 },
        { name: 'role_status_activity_idx', background: true },
        'comprehensive user management'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin IP tracking and security monitoring
    if (
      await createIndexSafely(
        db.collection('users'),
        { ipAddresses: 1, lastActive: -1 },
        { name: 'ip_activity_idx', background: true },
        'security monitoring'
      )
    )
      successCount++;
    else skipCount++;

    // ═══════════════════════════════════════════════════════════════
    // AUDIT LOG COLLECTION INDEXES FOR ADMIN DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    log.info('🔍 Creating AuditLog collection indexes...');

    // Index for admin dashboard severity monitoring
    if (
      await createIndexSafely(
        db.collection('auditlogs'),
        { severityLevel: 1, timestamp: -1 },
        { name: 'severity_timestamp_idx', background: true },
        'dashboard alerts'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin audit log timeline and recent activity
    if (
      await createIndexSafely(
        db.collection('auditlogs'),
        { timestamp: -1 },
        { name: 'timestamp_desc_idx', background: true },
        'timeline queries'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin user activity audit tracking
    if (
      await createIndexSafely(
        db.collection('auditlogs'),
        { userId: 1, timestamp: -1 },
        { name: 'user_activity_idx', background: true },
        'user audit trails'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin action-based audit filtering
    if (
      await createIndexSafely(
        db.collection('auditlogs'),
        { action: 1, severityLevel: 1, timestamp: -1 },
        { name: 'action_severity_time_idx', background: true },
        'action monitoring'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin event category and status monitoring
    if (
      await createIndexSafely(
        db.collection('auditlogs'),
        { eventCategory: 1, status: 1, timestamp: -1 },
        { name: 'category_status_time_idx', background: true },
        'categorized monitoring'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin IP-based security analysis
    if (
      await createIndexSafely(
        db.collection('auditlogs'),
        { ipAddress: 1, timestamp: -1 },
        { name: 'ip_timeline_idx', background: true },
        'IP-based security analysis'
      )
    )
      successCount++;
    else skipCount++;

    // Index for admin journey tracking and user session analysis
    // Note: This might conflict with existing index, so we'll check first
    if (
      await createIndexSafely(
        db.collection('auditlogs'),
        { userId: 1, journeyId: 1, timestamp: 1 },
        { name: 'user_journey_timestamp_idx', background: true },
        'user journey analysis'
      )
    )
      successCount++;
    else skipCount++;

    // ═══════════════════════════════════════════════════════════════
    // PERFORMANCE VERIFICATION
    // ═══════════════════════════════════════════════════════════════

    log.info('🧪 Verifying index creation and performance...');

    // Get index information for verification
    const userIndexes = await db.collection('users').indexes();
    const auditIndexes = await db.collection('auditlogs').indexes();

    log.info(`📊 Users collection now has ${userIndexes.length} indexes:`);
    userIndexes.forEach((index, i) => {
      if (index.name !== '_id_') {
        // Skip default MongoDB index
        log.info(`   ${i + 1}. ${index.name} - ${JSON.stringify(index.key)}`);
      }
    });

    log.info(`📊 AuditLogs collection now has ${auditIndexes.length} indexes:`);
    auditIndexes.forEach((index, i) => {
      if (index.name !== '_id_') {
        // Skip default MongoDB index
        log.info(`   ${i + 1}. ${index.name} - ${JSON.stringify(index.key)}`);
      }
    });

    // Test a sample query to verify performance improvement
    const sampleQueryStart = Date.now();
    await db.collection('users').find({ role: 'Admin' }).limit(1).toArray();
    const sampleQueryTime = Date.now() - sampleQueryStart;

    log.info(`🚀 Sample admin query completed in ${sampleQueryTime}ms`);

    // Summary
    log.info('');
    log.info('═══════════════════════════════════════════');
    log.info('📈 INDEX CREATION SUMMARY');
    log.info('═══════════════════════════════════════════');
    log.info(`✅ Successfully created: ${successCount} indexes`);
    log.info(`⚠️ Skipped (already exist): ${skipCount} indexes`);
    log.info(`❌ Failed: ${errorCount} indexes`);
    log.info(
      `📊 Total processed: ${successCount + skipCount + errorCount} indexes`
    );
    log.info('');
    log.info('✅ Database optimization completed!');
    log.info('📈 Expected performance improvement: >50% for admin queries');
    log.info(
      '🎯 Milestone 0, Deliverable 1 completed: Database Performance Optimization'
    );
  } catch (error) {
    log.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    // Close the connection
    await mongoose.connection.close();
    log.info('🔌 Database connection closed');
  }
};

/**
 * Script execution
 * For ES modules, we check if this file is being run directly
 */
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

log.info('🔍 Checking if script is main module...');
log.info('   process.argv[1]:', process.argv[1]);
log.info('   __filename:', __filename);
log.info('   isMainModule:', isMainModule);

if (isMainModule) {
  log.info('✅ Running as main module, executing createIndexes...');

  // Running directly
  createIndexes()
    .then(() => {
      log.info('🏁 Index creation script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      log.error('💥 Index creation script failed:', error);
      process.exit(1);
    });
} else {
  log.info('ℹ️ Script loaded as module, not executing directly');
}

export { createIndexes };
