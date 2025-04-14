const mongoose = require('mongoose');

const FavoriteQuoteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quoteId: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a compound unique index to prevent duplicate favorites for a user
FavoriteQuoteSchema.index({ user: 1, quoteId: 1 }, { unique: true });

module.exports = mongoose.model('FavoriteQuote', FavoriteQuoteSchema);
