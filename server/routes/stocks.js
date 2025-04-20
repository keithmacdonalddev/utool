import express from 'express';
import { getStockQuote } from '../controllers/stockController.js';
const router = express.Router();

// GET /api/v1/stocks/:symbol
router.get('/:symbol', getStockQuote);

export default router;
