import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import connectDB from '../config/config.js'; // No longer importing connectDB
import User from '../models/User.js'; // Adjust path to your User model

// Load environment variables
dotenv.config({
  path: 'c:/Users/macdo/Documents/Cline/utool/server/.env', // Corrected path to .env file
});

const renameNameField = async () => {
  if (!process.env.MONGO_URI) {
    console.error(
      'MONGO_URI not found in environment variables. Make sure it is set in c:/Users/macdo/Documents/Cline/utool/server/.env'
    );
    process.exit(1);
  }

  try {
    // await connectDB(); // No longer calling connectDB
    // Connect directly using mongoose.connect, similar to server.js
    await mongoose.connect(process.env.MONGO_URI, {
      // Add common mongoose connection options if your server.js uses them
      // useNewUrlParser: true, // Example, check your server.js for actual options used
      // useUnifiedTopology: true, // Example
    });
    console.log('MongoDB Connected for script...');

    // VERIFICATION STEP: Check for any users that still have the 'name' field
    const usersWithOldNameField = await User.find({
      name: { $exists: true },
    }).lean();
    if (usersWithOldNameField.length > 0) {
      console.warn(
        `WARNING: Found ${usersWithOldNameField.length} user(s) that still have the 'name' field. This should not happen if the migration was fully successful.`
      );
      usersWithOldNameField
        .slice(0, 5)
        .forEach((u) =>
          console.warn(
            `  - User ID with 'name' field: ${u._id}, Name: ${u.name}`
          )
        );
    } else {
      console.log(
        "VERIFICATION: Confirmed that no users have the 'name' field."
      );
    }
    // END VERIFICATION STEP

    // Section to remove 'name' field if 'username' already exists
    console.log(
      "Checking for users with both 'name' and 'username' fields to clean up..."
    );
    const usersWithBothFields = await User.find({
      name: { $exists: true },
      username: { $exists: true },
    }).lean(); // Keep .lean() if you only need to read _id, or remove if full mongoose doc is needed for some reason by other logic

    if (usersWithBothFields.length > 0) {
      console.log(
        `${usersWithBothFields.length} user(s) found with both 'name' and 'username'. Attempting to remove 'name' field individually using User.collection.updateOne()...`
      );
      let cleanupModifiedCount = 0;
      const cleanupMatchedCount = usersWithBothFields.length;

      for (const user of usersWithBothFields) {
        try {
          // Use User.collection.updateOne() for a more direct DB operation
          const directUpdateResult = await User.collection.updateOne(
            { _id: user._id, name: { $exists: true } }, // Condition still uses _id and checks for name
            { $unset: { name: '' } }
          );

          if (directUpdateResult.modifiedCount > 0) {
            console.log(
              `  - Successfully removed 'name' field for user ID: ${user._id} using direct DB command.`
            );
            cleanupModifiedCount++;
          } else if (
            directUpdateResult.matchedCount > 0 &&
            directUpdateResult.modifiedCount === 0
          ) {
            console.log(
              `  - Matched user ID: ${user._id} for 'name' field removal (direct DB) but did not modify. 'name' field might have been removed by another process or an issue persists.`
            );
          } else {
            // If matchedCount is 0, it means the document with _id and name field wasn't found by this direct command
            console.log(
              `  - Failed to match user ID: ${user._id} with 'name' field for direct DB removal. This is unexpected if the previous find operation located it.`
            );
          }
        } catch (e) {
          console.error(
            `  - Error removing 'name' field for user ID: ${user._id} (direct DB):`,
            e
          );
        }
      }
      console.log(
        'Individual name field removal operations (direct DB) completed.'
      );
      console.log(`Documents matched for cleanup: ${cleanupMatchedCount}`);
      console.log(
        `Documents successfully modified by cleanup: ${cleanupModifiedCount}`
      );
      if (
        cleanupModifiedCount === cleanupMatchedCount &&
        cleanupModifiedCount > 0
      ) {
        console.log(
          "Successfully removed 'name' field from all targeted users that also had 'username'."
        );
      } else if (cleanupModifiedCount > 0) {
        console.log(
          `Successfully removed 'name' field for ${cleanupModifiedCount} out of ${cleanupMatchedCount} targeted users.`
        );
      } else {
        console.log(
          'Cleanup operation did not modify any documents via individual updates, though matches were found. Please check logs.'
        );
      }
    } else {
      console.log(
        "No users found with both 'name' and 'username' fields. No cleanup of this type needed."
      );
    }
    // End section for removing 'name' field

    // 1. Find users that have a 'name' field and do NOT have a 'username' field
    const usersToRename = await User.find(
      {
        name: { $exists: true },
        username: { $exists: false },
      },
      '_id name' // Only select _id and name for logging purposes, if needed
    ).lean(); // .lean() for faster queries if we only need plain JS objects

    if (usersToRename.length === 0) {
      console.log(
        "No users found with a 'name' field and without a 'username' field. No action needed."
      );
    } else {
      console.log(
        `${usersToRename.length} user(s) found with a 'name' field and without a 'username' field. Attempting rename individually...`
      );

      let modifiedCount = 0;
      let matchedCount = usersToRename.length; // We already matched these users

      for (const user of usersToRename) {
        try {
          const updateResult = await User.updateOne(
            {
              _id: user._id,
              name: { $exists: true },
              username: { $exists: false },
            }, // Ensure the condition still holds
            {
              $set: { username: user.name },
              $unset: { name: '' },
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(
              `  - Successfully renamed 'name' to 'username' for user ID: ${user._id}`
            );
            modifiedCount++;
          } else if (
            updateResult.matchedCount > 0 &&
            updateResult.modifiedCount === 0
          ) {
            // This case means it matched but didn't modify, which is odd if we just found it.
            // Could be a concurrent update or an issue with the $unset part if name was already gone.
            console.log(
              `  - Matched user ID: ${user._id} but did not modify. Current name: ${user.name}. Checking if 'name' field still exists or 'username' was concurrently added.`
            );
            // Optionally, re-fetch the user to see its current state
            // const freshUser = await User.findById(user._id).lean();
            // console.log(`  - Fresh user state: `, freshUser);
          } else {
            // Did not match, which is unexpected as we are iterating over users that *should* match
            console.log(
              `  - Failed to match user ID: ${user._id} for update. This should not happen.`
            );
          }
        } catch (e) {
          console.error(`  - Error updating user ID: ${user._id}:`, e);
        }
      }

      console.log('Individual rename operations completed.');
      console.log(`Documents matched by initial query: ${matchedCount}`);
      console.log(`Documents successfully modified: ${modifiedCount}`);

      if (modifiedCount === matchedCount && modifiedCount > 0) {
        console.log(
          "Successfully renamed 'name' field to 'username' for all targeted documents."
        );
      } else if (modifiedCount > 0) {
        console.log(
          `Successfully renamed 'name' field for ${modifiedCount} out of ${matchedCount} targeted documents. Some may have failed or were already updated.`
        );
      } else if (matchedCount > 0 && modifiedCount === 0) {
        console.log(
          'Matched documents needing rename, but none were modified by the individual updates. Please check individual logs.'
        );
      } else {
        console.log('No documents were modified by the individual updates.');
      }
    }
  } catch (error) {
    console.error('Error during rename operation:', error);
  } finally {
    // FINAL VERIFICATION STEP: Check for any users that still have the 'name' field
    console.log("Performing final verification for 'name' field...");
    const finalCheckUsersWithOldNameField = await User.find({
      name: { $exists: true },
    }).lean();
    if (finalCheckUsersWithOldNameField.length > 0) {
      console.warn(
        `FINAL WARNING: Found ${finalCheckUsersWithOldNameField.length} user(s) that STILL have the 'name' field after all operations.`
      );
      finalCheckUsersWithOldNameField
        .slice(0, 5)
        .forEach((u) =>
          console.warn(
            `  - User ID with 'name' field: ${u._id}, Name: ${u.name}`
          )
        );
    } else {
      console.log(
        "FINAL VERIFICATION: Confirmed that no users have the 'name' field."
      );
    }
    // END FINAL VERIFICATION STEP

    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
};

renameNameField();
