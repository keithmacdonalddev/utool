import express from 'express';
import {
  getFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderBookmarks,
} from '../controllers/bookmarkFolderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes
router.route('/').get(getFolders).post(createFolder);
router.route('/:id').get(getFolder).put(updateFolder).delete(deleteFolder);
router.route('/:id/bookmarks').get(getFolderBookmarks);

export default router;
