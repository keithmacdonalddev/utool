import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getProjectNotes,
  createProjectNote,
  getProjectNote,
  updateProjectNote,
  deleteProjectNote,
  togglePinProjectNote,
} from '../controllers/projectNoteController.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(protect);

// Routes for /api/v1/projects/:projectId/notes
router.route('/').get(getProjectNotes).post(createProjectNote);

// Routes for /api/v1/projects/:projectId/notes/:id
router
  .route('/:id')
  .get(getProjectNote)
  .put(updateProjectNote)
  .delete(deleteProjectNote);

// Toggle pin status
router.route('/:id/toggle-pin').patch(togglePinProjectNote);

export default router;
