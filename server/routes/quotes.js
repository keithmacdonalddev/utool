import express from 'express';
import {
  addFavoriteQuote,
  checkFavoriteQuote,
  getFavoriteQuotes,
  removeFavoriteQuote,
} from '../controllers/quoteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Quote routes
router.route('/favorite').get(getFavoriteQuotes).post(addFavoriteQuote);

router
  .route('/favorite/:quoteId')
  .get(checkFavoriteQuote)
  .delete(removeFavoriteQuote);

export default router;
