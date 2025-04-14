const express = require('express');
const router = express.Router();
const { getCurrentWeather } = require('../controllers/weatherController');
const { protect } = require('../middleware/authMiddleware'); // Protect the route

// Apply protect middleware to ensure only logged-in users can access weather
router.use(protect);

// Define route for getting current weather
router.route('/').get(getCurrentWeather);

module.exports = router;
