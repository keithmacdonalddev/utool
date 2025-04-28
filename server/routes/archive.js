// archive.js - API routes for archive functionality
// This file defines the API endpoints for the archive feature

import express from 'express';
import {
  archiveItem,
  getArchiveItems,
  getProductivityMetrics,
  compareProductivity,
  restoreArchivedItem,
} from '../controllers/archiveController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes in this router (require authentication)
router.use(protect);

// Archive routes
router.post('/', archiveItem);
router.get('/', getArchiveItems);
router.get('/metrics', getProductivityMetrics);
router.get('/compare', compareProductivity);
router.post('/restore/:id', restoreArchivedItem);

export default router;
