import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

/**
 * @fileoverview Security Middleware Collection
 * @description Comprehensive security middleware for the project management application.
 * Implements multiple layers of security including rate limiting, input sanitization,
 * XSS protection, and other security best practices.
 */

/**
 * Rate limiting configurations for different endpoint types
 */
const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60, // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(
        `Rate limit exceeded for auth endpoint: ${
          req.ip
        } at ${new Date().toISOString()}`
      );
      res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Please try again later',
        retryAfter: 15 * 60,
      });
    },
  }),

  // Standard rate limiting for API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(
        `Rate limit exceeded for API endpoint: ${
          req.ip
        } at ${new Date().toISOString()}`
      );
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please slow down',
        retryAfter: 15 * 60,
      });
    },
  }),

  // Relaxed rate limiting for file uploads
  upload: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 uploads per window
    message: {
      error: 'Too many file uploads, please try again later.',
      retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Very strict rate limiting for password reset
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
      error: 'Too many password reset attempts, please try again later.',
      retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

/**
 * CORS configuration for different environments
 */
const getCorsConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (isDevelopment) {
        // In development, allow localhost with any port
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Socket-ID',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    maxAge: 86400, // 24 hours
  };
};

/**
 * Content Security Policy configuration
 */
const getCSPConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and CSS-in-JS
        'https://fonts.googleapis.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: [
        "'self'",
        'data:',
        'https:', // Allow images from HTTPS sources
        ...(isDevelopment ? ['http:'] : []),
      ],
      scriptSrc: [
        "'self'",
        ...(isDevelopment ? ["'unsafe-eval'"] : []), // Allow eval in development for hot reloading
      ],
      connectSrc: [
        "'self'",
        'ws://localhost:*', // WebSocket connections in development
        'wss://*', // Secure WebSocket connections in production
        ...(isDevelopment ? ['http://localhost:*'] : []),
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isDevelopment ? [] : true,
    },
    reportOnly: isDevelopment,
  };
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize against NoSQL injection attacks
    mongoSanitize()(req, res, () => {
      // Clean user input from malicious XSS
      xss()(req, res, () => {
        // Prevent HTTP Parameter Pollution attacks
        hpp({
          whitelist: ['tags', 'categories', 'sort', 'fields'], // Allow arrays for these fields
        })(req, res, next);
      });
    });
  } catch (error) {
    console.error('Security middleware error:', error);
    res.status(500).json({
      error: 'Internal security error',
      message: 'Request could not be processed safely',
    });
  }
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove sensitive headers that might leak information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // Add request ID for tracking
  if (!req.headers['x-request-id']) {
    req.requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
  }

  next();
};

/**
 * Request size limiting middleware
 */
const requestSizeLimiter = (req, res, next) => {
  const maxSize = process.env.MAX_REQUEST_SIZE || '10mb';
  const contentLength = req.headers['content-length'];

  if (contentLength) {
    const sizeMB = parseInt(contentLength) / (1024 * 1024);
    const maxSizeMB = parseInt(maxSize);

    if (sizeMB > maxSizeMB) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds ${maxSize} limit`,
        maxSize: maxSize,
      });
    }
  }

  next();
};

/**
 * IP whitelist/blacklist middleware
 */
const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const blacklistedIPs = process.env.BLACKLISTED_IPS
    ? process.env.BLACKLISTED_IPS.split(',')
    : [];

  if (blacklistedIPs.includes(clientIP)) {
    console.warn(`Blocked request from blacklisted IP: ${clientIP}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked',
    });
  }

  next();
};

/**
 * API version enforcement middleware
 */
const apiVersionControl = (req, res, next) => {
  const apiVersion = req.headers['api-version'] || req.query.version || 'v1';
  const supportedVersions = ['v1'];

  if (!supportedVersions.includes(apiVersion)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      message: `API version ${apiVersion} is not supported`,
      supportedVersions,
    });
  }

  req.apiVersion = apiVersion;
  next();
};

/**
 * Security audit logging middleware
 */
const securityAuditLogger = (req, res, next) => {
  const securityEvents = [
    'login',
    'logout',
    'password-change',
    'password-reset',
    'account-creation',
    'permission-change',
    'data-export',
  ];

  const endpoint = req.path.toLowerCase();
  const isSecurityEvent = securityEvents.some((event) =>
    endpoint.includes(event)
  );

  if (isSecurityEvent) {
    console.log(
      `Security Event: ${req.method} ${req.path} from ${
        req.ip
      } at ${new Date().toISOString()}`
    );

    // Add to audit log (you might want to store this in a database)
    req.auditLog = {
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      userId: req.user?.id || 'anonymous',
    };
  }

  next();
};

/**
 * Initialize all security middleware
 */
const initializeSecurity = (app) => {
  // Trust proxy if behind a reverse proxy (like nginx, AWS ALB, etc.)
  app.set('trust proxy', 1);

  // Basic security headers using Helmet
  app.use(
    helmet({
      contentSecurityPolicy: getCSPConfig(),
      crossOriginEmbedderPolicy: false, // Disable for compatibility
    })
  );

  // Compression middleware (should be early in the stack)
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024, // Only compress responses > 1KB
    })
  );

  // CORS middleware
  app.use(cors(getCorsConfig()));

  // Custom security middleware
  app.use(securityHeaders);
  app.use(requestSizeLimiter);
  app.use(ipFilter);
  app.use(sanitizeInput);
  app.use(securityAuditLogger);

  console.log('✅ Security middleware initialized successfully');
};

export {
  initializeSecurity,
  rateLimitConfigs,
  sanitizeInput,
  securityHeaders,
  requestSizeLimiter,
  ipFilter,
  apiVersionControl,
  securityAuditLogger,
};
