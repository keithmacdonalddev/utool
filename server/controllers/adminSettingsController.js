// server/controllers/adminSettingsController.js
import AppSettings from '../models/AppSettings.js';
import { logger } from '../utils/logger.js';
import { auditLog } from '../middleware/auditLogMiddleware.js';

/**
 * @desc    Get current guest access settings
 * @route   GET /api/v1/settings/guest-access (intended public route)
 * @access  Public (to be configured in routes)
 */
export const getGuestAccessSettings = async (req, res, next) => {
  try {
    const settings = await AppSettings.getSettings();
    res.status(200).json({
      success: true,
      data: {
        guestAccessEnabled: settings.guestAccessEnabled,
      },
    });
  } catch (err) {
    logger.error('Error fetching guest access settings', {
      error: err.message,
      stack: err.stack,
    });
    res
      .status(500)
      .json({ success: false, message: 'Server error fetching settings' });
  }
};

/**
 * @desc    Update guest access setting
 * @route   PUT /api/v1/admin/settings/guest-access (intended admin route)
 * @access  Private/Admin
 */
export const updateGuestAccessSettings = async (req, res, next) => {
  try {
    const { guestAccessEnabled } = req.body;

    if (typeof guestAccessEnabled !== 'boolean') {
      logger.warn(
        'Invalid type for guestAccessEnabled in updateGuestAccessSettings',
        {
          userId: req.user?.id,
          providedValue: guestAccessEnabled,
        }
      );
      return res
        .status(400)
        .json({
          success: false,
          message: 'Invalid input: guestAccessEnabled must be a boolean',
        });
    }

    const settings = await AppSettings.getSettings();
    const oldStatus = settings.guestAccessEnabled;

    settings.guestAccessEnabled = guestAccessEnabled;
    await settings.save();

    // Audit log the change
    await auditLog(req, 'guest_access_toggle', 'success', {
      adminUserId: req.user.id,
      previousStatus: oldStatus,
      newStatus: guestAccessEnabled,
    });

    logger.info('Guest access settings updated by admin', {
      adminUserId: req.user.id,
      newStatus: guestAccessEnabled,
    });

    res.status(200).json({
      success: true,
      data: {
        guestAccessEnabled: settings.guestAccessEnabled,
      },
      message: `Guest access ${
        guestAccessEnabled ? 'enabled' : 'disabled'
      } successfully.`,
    });
  } catch (err) {
    logger.error('Error updating guest access settings', {
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });
    // Audit log the failure
    await auditLog(req, 'guest_access_toggle', 'failed', {
      adminUserId: req.user?.id,
      error: err.message,
    });
    res
      .status(500)
      .json({ success: false, message: 'Server error updating settings' });
  }
};
