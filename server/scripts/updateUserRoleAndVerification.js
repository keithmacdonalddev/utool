import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import User from '../models/User.js'; // Adjust path as necessary

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file at the parent directory of 'scripts'
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const promptUser = (query, defaultValue) =>
  new Promise((resolve) =>
    rl.question(
      `${query} ${defaultValue ? '(' + defaultValue + ')' : ''}: `,
      (input) => resolve(input.trim() || defaultValue)
    )
  );

const updateUserRoleAndVerification = async () => {
  let userEmailToUpdate;
  let targetNodeEnv;

  try {
    console.log(
      '---------------------------------------------------------------------'
    );
    console.log('User Role and Verification Update Script');
    console.log(
      '---------------------------------------------------------------------'
    );

    targetNodeEnv = await promptUser(
      'Enter the NODE_ENV for the database you want to target (e.g., development, staging)',
      process.env.NODE_ENV || 'development'
    );

    if (process.env.NODE_ENV !== targetNodeEnv) {
      console.warn(
        `WARNING: Your current NODE_ENV is "${process.env.NODE_ENV}", but you are targeting "${targetNodeEnv}".`
      );
      const confirmEnv = await promptUser(
        `Are you sure you want to proceed with NODE_ENV "${targetNodeEnv}"? (yes/no)`
      );
      if (confirmEnv.toLowerCase() !== 'yes') {
        console.log('Operation cancelled by user.');
        return;
      }
    }
    // Temporarily override NODE_ENV for this script run if different
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = targetNodeEnv;
    // Reload dotenv with the potentially overridden NODE_ENV to get correct MONGO_URI
    dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

    userEmailToUpdate = await promptUser(
      'Enter the email of the user to update',
      'macdonaldkeith@hotmail.com'
    );

    if (!userEmailToUpdate) {
      console.error('ERROR: User email is required.');
      return;
    }

    console.log(`
    ---------------------------------------------------------------------
    CONFIRM ACTION:
    ---------------------------------------------------------------------
    Target Environment (NODE_ENV): ${targetNodeEnv}
    User Email to Update:          ${userEmailToUpdate}
    Action:                        Set role to "Admin" and isVerified to true.
    ---------------------------------------------------------------------
    `);

    const confirmUpdate = await promptUser(
      'Are you absolutely sure you want to perform this update? (yes/no)'
    );

    if (confirmUpdate.toLowerCase() !== 'yes') {
      console.log('Update cancelled by user.');
      return;
    }

    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error(
        'ERROR: MONGO_URI is not defined in your .env file for the target environment.'
      );
      return;
    }

    console.log(`Connecting to database for ${targetNodeEnv} environment...`);
    await mongoose.connect(mongoURI);
    console.log('Successfully connected to MongoDB.');

    const user = await User.findOne({ email: userEmailToUpdate });

    if (!user) {
      console.error(`ERROR: User with email "${userEmailToUpdate}" not found.`);
      return;
    }

    console.log(
      `Found user: ${user.username} (ID: ${user._id}, Current Role: ${user.role}, Verified: ${user.isVerified})`
    );

    user.role = 'Admin';
    user.isVerified = true;

    await user.save(); // This will trigger Mongoose 'save' hooks if any are relevant

    console.log(
      `Successfully updated user "${userEmailToUpdate}": New Role: ${user.role}, Verified: ${user.isVerified}`
    );

    // Restore original NODE_ENV if it was changed
    if (originalNodeEnv !== process.env.NODE_ENV) {
      process.env.NODE_ENV = originalNodeEnv;
    }
  } catch (error) {
    console.error('An error occurred during the update process:', error);
  } finally {
    rl.close();
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
};

updateUserRoleAndVerification();
