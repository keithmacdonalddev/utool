const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
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

  // Make sure token exists
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token payload (ID) and attach to request
    // Exclude password from being attached
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      // Handle case where user associated with token no longer exists
      return res
        .status(401)
        .json({ success: false, message: 'Not authorized, user not found' });
    }

    next(); // Proceed to the next middleware/route handler
  } catch (err) {
    console.error('Token verification error:', err);
    // Handle specific JWT errors like TokenExpiredError if needed
    return res
      .status(401)
      .json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Import permissions config and helper
const { permissions, featureFlags, ACCESS_LEVELS, hasAccess } = require('../config/permissions');

// Grant access based on feature and required access level
exports.authorize = (feature, requiredLevel) => {
  return async (req, res, next) => { // Made async to potentially fetch resource for 'own' check
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const userRole = req.user.role;

    // 1. Check if the feature is globally enabled (optional but good practice)
    if (featureFlags[feature] === false) {
       return res.status(403).json({ success: false, message: `Feature '${feature}' is currently disabled.` });
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
    if (requiredLevel === ACCESS_LEVELS.READ || requiredLevel === ACCESS_LEVELS.FULL || requiredLevel === ACCESS_LEVELS.CREATE_EDIT) {
      if (hasAccess(userLevel, requiredLevel)) {
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
      // If user has FULL or CREATE_EDIT, they automatically pass 'own' check for this feature
      if (userLevel === ACCESS_LEVELS.FULL || userLevel === ACCESS_LEVELS.CREATE_EDIT) {
        return next();
      }
      // If user only has 'OWN' level, we need to verify ownership of the specific resource
      if (userLevel === ACCESS_LEVELS.OWN) {
        // This requires fetching the resource and comparing its owner field (e.g., 'author', 'user') with req.user._id
        // This logic needs to be adapted based on the specific resource model and route params
        // Example for a resource with an 'author' field and ID in req.params.id:
        const resourceId = req.params.id; // Assuming ID is in params
        if (!resourceId) {
           console.warn(`Ownership check failed: Missing resource ID in request params for feature '${feature}'.`);
           return res.status(400).json({ success: false, message: 'Resource ID missing for ownership check.' });
        }

        try {
          // Dynamically determine the model based on the feature
          let Model;
          switch (feature) {
            case 'knowledgeBase': Model = require('../models/KnowledgeBaseArticle'); break;
            case 'projects': Model = require('../models/Project'); break;
            case 'tasks': Model = require('../models/Task'); break;
            case 'notes': Model = require('../models/Note'); break;
            // Add cases for 'blogPosts' etc.
            default:
              console.error(`Ownership check failed: No model mapping for feature '${feature}'.`);
              return res.status(500).json({ success: false, message: 'Internal server error during authorization.' });
          }

          const resource = await Model.findById(resourceId).select('author user'); // Select potential owner fields
          if (!resource) {
            return res.status(404).json({ success: false, message: 'Resource not found.' });
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
           console.error(`Error during ownership check for feature '${feature}', ID '${resourceId}':`, err);
           return res.status(500).json({ success: false, message: 'Internal server error during authorization.' });
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
    console.warn(`Authorization check bypassed: Unhandled requiredLevel '${requiredLevel}' for feature '${feature}'.`);
    next(); // Or return an error if strict handling is needed
  };
};
