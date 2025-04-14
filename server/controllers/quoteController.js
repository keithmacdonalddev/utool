const FavoriteQuote = require('../models/FavoriteQuote');
const { auditLog } = require('../middleware/auditLogMiddleware');

// @desc    Add a quote to favorites
// @route   POST /api/v1/quotes/favorite
// @access  Private
exports.addFavoriteQuote = async (req, res) => {
  try {
    const { quoteId, text, author } = req.body;

    if (!quoteId || !text || !author) {
      return res.status(400).json({
        success: false,
        message: 'Please provide quoteId, text, and author',
      });
    }

    // Check if already a favorite
    const existingFavorite = await FavoriteQuote.findOne({
      user: req.user._id,
      quoteId,
    });

    if (existingFavorite) {
      return res.status(200).json({
        success: true,
        message: 'Quote is already in favorites',
        data: existingFavorite,
      });
    }

    // Create new favorite
    const favoriteQuote = await FavoriteQuote.create({
      user: req.user._id,
      quoteId,
      text,
      author,
    });

    // Log the action
    await auditLog(req, 'content_create', 'success', {
      contentType: 'favorite-quote',
      quoteId: favoriteQuote.quoteId,
    });

    res.status(201).json({
      success: true,
      data: favoriteQuote,
    });
  } catch (err) {
    console.error('Add Favorite Quote Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error adding favorite quote',
    });
  }
};

// @desc    Check if a quote is in user's favorites
// @route   GET /api/v1/quotes/favorite/:quoteId
// @access  Private
exports.checkFavoriteQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;

    const favoriteQuote = await FavoriteQuote.findOne({
      user: req.user._id,
      quoteId,
    });

    res.status(200).json({
      success: Boolean(favoriteQuote),
      data: favoriteQuote,
    });
  } catch (err) {
    console.error('Check Favorite Quote Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error checking favorite quote',
    });
  }
};

// @desc    Get all favorite quotes for the logged-in user
// @route   GET /api/v1/quotes/favorite
// @access  Private
exports.getFavoriteQuotes = async (req, res) => {
  try {
    const favoriteQuotes = await FavoriteQuote.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: favoriteQuotes.length,
      data: favoriteQuotes,
    });
  } catch (err) {
    console.error('Get Favorite Quotes Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error getting favorite quotes',
    });
  }
};

// @desc    Remove a quote from favorites
// @route   DELETE /api/v1/quotes/favorite/:quoteId
// @access  Private
exports.removeFavoriteQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;

    const result = await FavoriteQuote.findOneAndDelete({
      user: req.user._id,
      quoteId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Favorite quote not found',
      });
    }

    // Log the action
    await auditLog(req, 'content_delete', 'success', {
      contentType: 'favorite-quote',
      quoteId,
    });

    res.status(200).json({
      success: true,
      message: 'Quote removed from favorites',
    });
  } catch (err) {
    console.error('Remove Favorite Quote Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error removing favorite quote',
    });
  }
};
