import express from 'express';
import {
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
} from '../controllers/snippetController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware for all routes
router.use(protect);

router.route('/').get(getSnippets).post(createSnippet);

router.route('/:id').get(getSnippet).put(updateSnippet).delete(deleteSnippet);

export default router;
