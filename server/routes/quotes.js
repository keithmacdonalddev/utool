const express = require('express');
const {
  addFavoriteQuote,
  checkFavoriteQuote,
  getFavoriteQuotes,
  removeFavoriteQuote,
} = require('../controllers/quoteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Quote routes
router.route('/favorite').get(getFavoriteQuotes).post(addFavoriteQuote);

router
  .route('/favorite/:quoteId')
  .get(checkFavoriteQuote)
  .delete(removeFavoriteQuote);

module.exports = router;
