import express from 'express';
import { getCurrentWeather } from '../controllers/weatherController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect middleware to ensure only logged-in users can access weather
router.use(protect);

// Define route for getting current weather
router.route('/').get(getCurrentWeather);

export default router;
