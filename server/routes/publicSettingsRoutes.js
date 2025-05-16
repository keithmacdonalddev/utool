// server/routes/publicSettingsRoutes.js
import express from 'express';
import { getGuestAccessSettings } from '../controllers/adminSettingsController.js'; // Still uses the same controller method

const router = express.Router();

// Public route to get guest access status
router.route('/guest-access-status').get(getGuestAccessSettings);

export default router;
