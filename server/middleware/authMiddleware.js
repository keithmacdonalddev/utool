// authMiddleware.js - JWT Authentication & Authorization Middleware
import jwt from 'jsonwebtoken';
import asyncHandler from './async.js';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';
import { isTokenBlacklisted } from '../utils/tokenBlacklist.js'; // Import blacklist checker
import AppSettings from '../models/AppSettings.js'; // Import AppSettings
import { randomUUID } from 'crypto'; // Import for secure ID generation
import {
  permissions,
  featureFlags,
  ACCESS_LEVELS,
  hasAccess,
} from '../config/permissions.js';

/*
┌─────────────────────────────────────────────────────────────┐
│ JWT AUTHENTICATION MIDDLEWARE EDUCATIONAL GUIDE             │
│                                                             │
│ This middleware implements token-based authentication       │
│ using JSON Web Tokens (JWT) which:                          │
│                                                             │
│ 1. TOKEN EXTRACTION & VERIFICATION                          │
│    - Extracts JWT from request headers or cookies           │
│    - Verifies token signature using server's secret key     │
│    - Decodes payload to retrieve user information           │
│                                                             │
│ 2. STATELESS AUTHENTICATION                                 │
│    - No session storage required on server                  │
│    - Each request contains credentials (the token)          │
│    - Enables horizontal scaling of backend servers          │
│                                                             │
│ 3. USER AUTHORIZATION                                       │
│    - Fetches current user from database using token ID      │
│    - Attaches user object to request for downstream use     │
│    - Enables role-based access control in route handlers    │
│                                                             │
│ 4. SECURITY MEASURES                                        │
│    - Token expiration to limit validity period              │
│    - Optional refresh token rotation                        │
│    - Protection against various attack vectors              │
└─────────────────────────────────────────────────────────────┘
*/

// Protect routes - verify user is authenticated with valid JWT or is a guest
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // TODO: Add check for token in cookies if implementing cookie-based auth primarily
  // else if (req.cookies.token) {
  //     token = req.cookies.token;
  // }

  // Make sure token exists or guest access is enabled
  if (!token) {
    try {
      const settings = await AppSettings.getSettings();
      if (settings.guestAccessEnabled) {
        // If guest access is enabled and no token, treat as guest
        req.user = {
          _id: `guest_${randomUUID()}`,
          username: 'Guest User', // Changed from name to username
          firstName: 'Guest', // Added firstName for guest
          lastName: 'User', // Added lastName for guest
          role: 'Guest', // Standardized role name
          isGuest: true, // Explicit flag for guest identification
        };
        return next(); // Proceed as guest
      } else {
        // No token and guest access is disabled
        // console.log('Access denied: No token and guest access disabled.'); // Optional: for debugging
        return res.status(401).json({
          success: false,
          message: 'Not authorized. Please log in.', // User-friendly message
        });
      }
    } catch (error) {
      console.error(
        'Error checking guest access settings in protect middleware:',
        error.message,
        error.stack
      );
      return res.status(500).json({
        success: false,
        message: 'Server error during authentication check.', // User-friendly message
      });
    }
  }

  // If a token exists, proceed with token verification
  try {
    // Check if token is blacklisted (logged out)
    if (isTokenBlacklisted(token)) {
      // console.log('Access denied: Token is blacklisted.'); // Optional: for debugging
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token has been invalidated.', // User-friendly message
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists and attach to request object
    // The decoded token now contains `id` and `username`.
    // We fetch the full user object to ensure all fields are up-to-date.
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      // console.log('Access denied: User not found for token.'); // Optional: for debugging
      return res.status(401).json({
        success: false,
        message: 'Not authorized. User not found.', // User-friendly message
      });
    }

    // Check if user is verified (if applicable to the route, could be a separate middleware)
    // For now, basic protection just ensures user exists and token is valid.
    // Specific routes can add more checks like `authorize` middleware for roles.

    // console.log('User authenticated:', req.user.email, req.user.role); // Optional: for debugging
    next();
  } catch (error) {
    // console.error('Authentication error in protect middleware:', error.message); // Optional: for debugging
    // Handle specific JWT errors for better client feedback
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Invalid token.', // User-friendly message
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token expired.', // User-friendly message
      });
    }
    // Fallback for other errors
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in.', // User-friendly message
    });
  }
});

// Grant access based on feature and required access level
export const authorize = (feature, requiredLevel) => {
  return async (req, res, next) => {
    // Made async to potentially fetch resource for 'own' check
    if (!req.user) {
      // This should ideally not be hit if 'protect' middleware is always used before 'authorize'
      // and 'protect' now handles guest user creation or explicit denial.
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user object not found on request',
      });
    }

    const userRole = req.user.role;

    // 1. Check if the feature is globally enabled (optional but good practice)
    if (featureFlags[feature] === false) {
      return res.status(403).json({
        success: false,
        message: `Feature '${feature}' is currently disabled.`,
      });
    }

    // 2. Get the user's permission level for this feature
    const userLevel = permissions[userRole]?.[feature];

    if (!userLevel || userLevel === ACCESS_LEVELS.NONE) {
      return res.status(403).json({
        success: false,
        message: `Your role (${userRole}) does not have access to the feature '${feature}'.`,
      });
    }

    // 3. Check if the user's level meets the required level for the action
    // Simple check for 'read', 'full', 'create_edit'
    if (
      requiredLevel === ACCESS_LEVELS.READ ||
      requiredLevel === ACCESS_LEVELS.FULL ||
      requiredLevel === ACCESS_LEVELS.CREATE_EDIT
    ) {
      if (hasAccess(userLevel, requiredLevel)) {
        // For Guest users, if the required level is READ and they have READ access, allow.
        // Otherwise, if it's CREATE_EDIT or FULL, guests should be denied even if hasAccess might pass based on 'Guest' having 'READ'.
        // This is a specific check to ensure guests cannot perform write operations even if a feature is generally 'READ' accessible.
        // However, the permissions for 'Guest' are already set to 'READ' for relevant features,
        // and 'NONE' for sensitive ones like 'siteSettings' or 'userManagement'.
        // The `hasAccess` function and role permissions should correctly restrict guests.
        // If a guest tries to access a 'FULL' or 'CREATE_EDIT' required endpoint,
        // their 'READ' permission for that feature (or 'NONE') will correctly be evaluated by `hasAccess`.
        return next(); // User has sufficient general access
      } else {
        return res.status(403).json({
          success: false,
          message: `Your role (${userRole}) requires '${requiredLevel}' access for '${feature}', but only has '${userLevel}'.`,
        });
      }
    }

    // 4. Handle 'own' access level check (more complex)
    if (requiredLevel === ACCESS_LEVELS.OWN) {
      // Guests cannot "own" resources in a persistent way.
      // If a guest somehow reaches an 'own' check, they should be denied.
      // The 'Guest' role in permissions.js has 'READ' access for data features, not 'OWN'.
      // This check primarily applies to authenticated users.
      if (userRole === 'Guest') {
        return res.status(403).json({
          success: false,
          message: 'Guests cannot perform actions requiring ownership.',
        });
      }

      // If user has FULL or CREATE_EDIT, they automatically pass 'own' check for this feature
      if (
        userLevel === ACCESS_LEVELS.FULL ||
        userLevel === ACCESS_LEVELS.CREATE_EDIT
      ) {
        return next();
      }
      // If user only has 'OWN' level, we need to verify ownership of the specific resource
      if (userLevel === ACCESS_LEVELS.OWN) {
        // This requires fetching the resource and comparing its owner field (e.g., 'author', 'user') with req.user._id
        // This logic needs to be adapted based on the specific resource model and route params
        // Example for a resource with an 'author' field and ID in req.params.id:
        const resourceId = req.params.id; // Assuming ID is in params
        if (!resourceId) {
          console.warn(
            `Ownership check failed: Missing resource ID in request params for feature '${feature}'.`
          );
          return res.status(400).json({
            success: false,
            message: 'Resource ID missing for ownership check.',
          });
        }

        try {
          // Dynamically determine the model based on the feature
          let Model;
          switch (feature) {
            case 'knowledgeBase':
              Model = (await import('../models/KnowledgeBaseArticle.js'))
                .default;
              break;
            case 'projects':
              Model = (await import('../models/Project.js')).default;
              break;
            case 'tasks':
              Model = (await import('../models/Task.js')).default;
              break;
            case 'notes':
              Model = (await import('../models/Note.js')).default;
              break;
            // Add cases for 'blogPosts' etc.
            default:
              console.error(
                `Ownership check failed: No model mapping for feature '${feature}'.`
              );
              return res.status(500).json({
                success: false,
                message: 'Internal server error during authorization.',
              });
          }

          const resource = await Model.findById(resourceId).select(
            'author user'
          ); // Select potential owner fields
          if (!resource) {
            return res
              .status(404)
              .json({ success: false, message: 'Resource not found.' });
          }

          // Check common owner fields ('author' or 'user')
          const ownerField = resource.author || resource.user;
          if (ownerField && ownerField.toString() === req.user._id.toString()) {
            return next(); // User owns the resource
          } else {
            return res.status(403).json({
              success: false,
              message: `You do not own this resource and require '${requiredLevel}' access for '${feature}'.`,
            });
          }
        } catch (err) {
          console.error(
            `Error during ownership check for feature '${feature}', ID '${resourceId}':`,
            err
          );
          return res.status(500).json({
            success: false,
            message: 'Internal server error during authorization.',
          });
        }
      } else {
        // User has 'read' or 'none', which is insufficient for 'own' requirement
        return res.status(403).json({
          success: false,
          message: `Your role (${userRole}) requires ownership access for '${feature}', but only has '${userLevel}'.`,
        });
      }
    }

    // If requiredLevel is not recognized or handled
    console.warn(
      `Authorization check bypassed: Unhandled requiredLevel '${requiredLevel}' for feature '${feature}'.`
    );
    next(); // Or return an error if strict handling is needed
  };
};
