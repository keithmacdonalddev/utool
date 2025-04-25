import express from 'express';
import {
  getBookmarks,
  getBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../controllers/bookmarkController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware for all routes
router.use(protect);

router.route('/').get(getBookmarks).post(createBookmark);

router
  .route('/:id')
  .get(getBookmark)
  .put(updateBookmark)
  .delete(deleteBookmark);

export default router;
