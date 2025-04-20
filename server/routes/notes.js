import express from 'express';
const router = express.Router({ mergeParams: true });
import { protect, authorize } from '../middleware/authMiddleware.js';
import { ACCESS_LEVELS } from '../config/permissions.js';
import {
  getNotesForTask,
  createNoteForTask,
} from '../controllers/noteController.js';

// Protect is applied first
router.use(protect);
// Note: Authorization for accessing the parent task is handled where this router is mounted in tasks.js

// Define routes relative to the parent task route (e.g., /api/v1/tasks/:taskId/notes)
router
  .route('/')
  // Reading notes requires 'read' access for notes feature
  .get(authorize('notes', ACCESS_LEVELS.READ), getNotesForTask)
  // Creating notes requires 'own' access for notes feature
  .post(authorize('notes', ACCESS_LEVELS.OWN), createNoteForTask);

// Routes for specific note ID (add later with controllers)
router
  .route('/:noteId') // Changed param to :noteId for clarity
  // Reading a specific note requires 'read' access
  .get(authorize('notes', ACCESS_LEVELS.READ), (req, res) =>
    res.status(501).json({ message: 'Get single note not implemented' })
  ) // Placeholder
  // Updating requires 'own' access
  .put(authorize('notes', ACCESS_LEVELS.OWN), (req, res) =>
    res.status(501).json({ message: 'Update note not implemented' })
  ) // Placeholder
  // Deleting requires 'own' access
  .delete(authorize('notes', ACCESS_LEVELS.OWN), (req, res) =>
    res.status(501).json({ message: 'Delete note not implemented' })
  ); // Placeholder

export default router;
