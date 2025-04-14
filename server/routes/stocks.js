const express = require('express');
const { getStockQuote } = require('../controllers/stockController');
const router = express.Router();

// GET /api/v1/stocks/:symbol
router.get('/:symbol', getStockQuote);

module.exports = router;
