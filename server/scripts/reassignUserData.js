import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Import all relevant models
import User from '../models/User.js'; // Needed for ObjectId conversion and verification
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Note from '../models/Note.js'; // General notes
import Snippet from '../models/Snippet.js';
import Bookmark from '../models/Bookmark.js';
import Comment from '../models/Comment.js'; // Comments on KnowledgeBaseArticles
import KnowledgeBaseArticle from '../models/KnowledgeBaseArticle.js';
import FavoriteQuote from '../models/FavoriteQuote.js';
import Archive from '../models/Archive.js';
import SnippetCategory from '../models/SnippetCategory.js';
import BookmarkFolder from '../models/BookmarkFolder.js';
import ProjectNote from '../models/ProjectNote.js'; // Notes specific to a project
import TaskNote from '../models/TaskNote.js'; // Notes specific to a task
import Notification from '../models/Notification.js';
// Analytics and AppSettings are not user-specific in terms of direct ownership field to change.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the .env file located in the server directory
const envPath = path.resolve(__dirname, '../.env'); // Points to server/.env
console.log(`Attempting to load .env file from: ${envPath}`);
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.error('Error loading .env file:', dotenvResult.error);
} else {
  console.log('.env file loaded successfully.');
  // console.log('Parsed environment variables:', dotenvResult.parsed); // Potentially sensitive, enable if necessary
}

console.log(
  `MONGO_URI from process.env after dotenv.config: ${process.env.MONGO_URI}`
);

const TARGET_USER_ID_STRING = '68292d4ce375783ed6df886a';

const modelsToUpdate = [
  { modelName: 'Project', model: Project, ownerField: 'owner' },
  { modelName: 'Task', model: Task, ownerField: 'assignee' }, // Or 'user' if tasks have a direct user owner separate from assignee
  { modelName: 'Note', model: Note, ownerField: 'user' }, // General notes
  { modelName: 'Snippet', model: Snippet, ownerField: 'user' },
  { modelName: 'Bookmark', model: Bookmark, ownerField: 'user' },
  { modelName: 'Comment', model: Comment, ownerField: 'author' }, // Comments on KB articles
  {
    modelName: 'KnowledgeBaseArticle',
    model: KnowledgeBaseArticle,
    ownerField: 'author',
  },
  { modelName: 'FavoriteQuote', model: FavoriteQuote, ownerField: 'user' },
  { modelName: 'Archive', model: Archive, ownerField: 'user' }, // Archived items
  { modelName: 'SnippetCategory', model: SnippetCategory, ownerField: 'user' },
  { modelName: 'BookmarkFolder', model: BookmarkFolder, ownerField: 'user' },
  { modelName: 'ProjectNote', model: ProjectNote, ownerField: 'user' }, // Project-specific notes
  { modelName: 'TaskNote', model: TaskNote, ownerField: 'author' }, // Task-specific notes
  { modelName: 'Notification', model: Notification, ownerField: 'user' }, // Notifications for a user
];

async function reassignData() {
  if (!process.env.MONGO_URI) {
    console.error(
      'MONGO_URI not found in .env file. Please ensure it is correctly set in the /Users/keith/Desktop/cline/uTool/.env file.'
    );
    process.exit(1);
  }

  if (!TARGET_USER_ID_STRING) {
    console.error('TARGET_USER_ID_STRING is not defined.');
    process.exit(1);
  }

  let targetUserIdObjectId;
  try {
    targetUserIdObjectId = new mongoose.Types.ObjectId(TARGET_USER_ID_STRING);
  } catch (error) {
    console.error(
      `Invalid TARGET_USER_ID_STRING: ${TARGET_USER_ID_STRING}. It must be a valid MongoDB ObjectId string.`
    );
    console.error(error.message);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Verify the target user exists
    const targetUser = await User.findById(targetUserIdObjectId);
    if (!targetUser) {
      console.warn(
        `Warning: Target user with ID ${TARGET_USER_ID_STRING} does not exist in the User collection. Proceeding with reassignment, but the new owner ID will not correspond to an existing user.`
      );
    } else {
      console.log(
        `Target user ${targetUser.email} (ID: ${TARGET_USER_ID_STRING}) found. Proceeding with reassignment.`
      );
    }

    console.log('\n--- Starting Data Reassignment ---');

    for (const { modelName, model, ownerField } of modelsToUpdate) {
      if (!model || typeof model.updateMany !== 'function') {
        console.error(
          `Error: Model ${modelName} is not a valid Mongoose model or does not have updateMany method. Skipping.`
        );
        continue;
      }
      try {
        console.log(
          `Processing model: ${modelName}, owner field: ${ownerField}`
        );

        // This condition ensures we only update documents NOT ALREADY owned by the target user.
        // To reassign ALL documents of this type to the target user, regardless of current owner,
        // you would remove the queryCondition or set it to {}.
        const queryCondition = { [ownerField]: { $ne: targetUserIdObjectId } };
        const updateOperation = {
          $set: { [ownerField]: targetUserIdObjectId },
        };

        const result = await model.updateMany(queryCondition, updateOperation);

        console.log(
          `  ${modelName}: ${result.modifiedCount} documents updated to user ID ${TARGET_USER_ID_STRING}. (${result.matchedCount} documents matched the query criteria)`
        );
      } catch (modelError) {
        console.error(`Error updating ${modelName}:`, modelError.message);
        if (modelError.stack) {
          console.error(modelError.stack.split('\n').slice(0, 5).join('\n')); // Log first 5 lines of stack
        }
      }
    }

    console.log('\n--- Data Reassignment Script Finished ---');
    console.log('IMPORTANT: Please verify the changes in your database.');
    console.log(
      'Consider creating a backup before running such scripts in production environments.'
    );
  } catch (error) {
    console.error('Critical error during data reassignment process:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

reassignData();
