import express from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/snippetCategoryController.js';

// Import middleware
import { protect } from '../middleware/authMiddleware.js';
import { auditLog } from '../middleware/auditLogMiddleware.js';

/**
 * Router for snippet category endpoints
 * All routes in this file are protected and require authentication
 * CRUD operations for managing code snippet categories
 */
const router = express.Router();

// Apply protection middleware to all routes
router.use(protect);

// Routes for /api/v1/snippets/categories
router
  .route('/')
  .get(getCategories)
  .post(auditLog('create-snippet-category'), createCategory);

// Routes for /api/v1/snippets/categories/:id
router
  .route('/:id')
  .get(getCategory)
  .put(auditLog('update-snippet-category'), updateCategory)
  .delete(auditLog('delete-snippet-category'), deleteCategory);

export default router;
