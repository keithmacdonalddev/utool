// filepath: server/scripts/migrateNameFields.js
// Data Migration Script: Convert 'name' field to 'firstName' and 'lastName'
// This script safely migrates existing user data from the old single 'name' field
// to the new separate 'firstName' and 'lastName' fields

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env file
// This ensures we connect to the correct database using the same config as the main app
dotenv.config();

// Connect to MongoDB using the same connection string as the main application
// This ensures we're working with the same database that the app uses
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true, // Use new MongoDB connection string parser
      useUnifiedTopology: true, // Use new Server Discover and Monitoring engine
    });
    console.log('✅ MongoDB Connected for Migration');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1); // Exit the process if database connection fails
  }
};

// Migration function to convert existing 'name' fields to 'firstName' and 'lastName'
const migrateNameFields = async () => {
  try {
    console.log('🔄 Starting name field migration...');

    // Access the users collection directly to work with both old and new schema
    // We use the native MongoDB collection interface to handle the schema transition
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all users that still have the old 'name' field
    // This query specifically looks for documents with 'name' field but without firstName/lastName
    const usersWithOldNameField = await usersCollection
      .find({
        name: { $exists: true }, // Has the old 'name' field
        $or: [
          { firstName: { $exists: false } }, // Missing firstName field
          { lastName: { $exists: false } }, // Missing lastName field
        ],
      })
      .toArray();

    console.log(`📊 Found ${usersWithOldNameField.length} users to migrate`);

    if (usersWithOldNameField.length === 0) {
      console.log(
        '✅ No users need migration - all users already have firstName/lastName fields'
      );
      return;
    }

    // Process each user individually for safe, controlled migration
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithOldNameField) {
      try {
        // Split the existing name into firstName and lastName
        // Handle edge cases like single names, extra spaces, etc.
        const nameParts = (user.name || '').trim().split(/\s+/); // Split on any whitespace

        let firstName, lastName;

        if (nameParts.length === 0 || nameParts[0] === '') {
          // Edge case: empty or undefined name
          firstName = 'Unknown';
          lastName = 'User';
        } else if (nameParts.length === 1) {
          // Single name: use as firstName, set lastName to empty string
          firstName = nameParts[0];
          lastName = '';
        } else {
          // Multiple parts: first part as firstName, rest joined as lastName
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' '); // Join remaining parts with spaces
        }

        // Update the user document with new firstName/lastName fields
        // We keep the original 'name' field temporarily for safety - it can be removed later
        const updateResult = await usersCollection.updateOne(
          { _id: user._id }, // Find this specific user
          {
            $set: {
              firstName: firstName,
              lastName: lastName,
              updatedAt: new Date(), // Update the timestamp
            },
            // Note: We deliberately don't remove the 'name' field yet for rollback safety
          }
        );

        if (updateResult.modifiedCount === 1) {
          successCount++;
          console.log(
            `✅ Migrated user: ${user.email} | "${user.name}" → "${firstName}" + "${lastName}"`
          );
        } else {
          errorCount++;
          console.log(`❌ Failed to update user: ${user.email}`);
        }
      } catch (userError) {
        errorCount++;
        console.error(`❌ Error migrating user ${user.email}:`, userError);
      }
    }

    // Report final migration results
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Failed migrations: ${errorCount} users`);
    console.log(`📊 Total processed: ${usersWithOldNameField.length} users`);

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log(
        '💡 The original "name" field has been preserved for safety.'
      );
      console.log(
        '💡 You can remove it later after verifying the migration worked correctly.'
      );
    } else {
      console.log(
        '\n⚠️  Migration completed with some errors. Please review the failed users.'
      );
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Function to verify the migration results
// This helps ensure the migration worked correctly before removing old data
const verifyMigration = async () => {
  try {
    console.log('\n🔍 Verifying migration results...');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Count users with firstName and lastName
    const usersWithNewFields = await usersCollection.countDocuments({
      firstName: { $exists: true },
      lastName: { $exists: true },
    });

    // Count users still missing the new fields
    const usersWithoutNewFields = await usersCollection.countDocuments({
      $or: [
        { firstName: { $exists: false } },
        { lastName: { $exists: false } },
      ],
    });

    // Total user count
    const totalUsers = await usersCollection.countDocuments({});

    console.log(`📊 Verification Results:`);
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Users with new fields: ${usersWithNewFields}`);
    console.log(`   Users missing new fields: ${usersWithoutNewFields}`);

    if (usersWithoutNewFields === 0) {
      console.log(
        '✅ Verification passed: All users have firstName and lastName fields'
      );
    } else {
      console.log(
        '⚠️  Some users are missing the new fields. Migration may need to be run again.'
      );
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
};

// Main execution function
const runMigration = async () => {
  try {
    // Connect to database
    await connectDB();

    // Run the migration
    await migrateNameFields();

    // Verify the results
    await verifyMigration();

    console.log('\n🏁 Migration script completed');
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1); // Exit with error code
  } finally {
    // Always close the database connection when done
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Execute the migration if this script is run directly
// This allows the script to be imported without auto-execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { migrateNameFields, verifyMigration };
