const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { authRateLimiter } = require('../middleware/authRateLimiter');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const { firstAdminSetupSchema, loginSchema } = require('../validators/authValidators');

const router = express.Router();

router.get('/admin/setup-status', authController.getAdminSetupStatus);
router.post(
  '/admin/setup',
  authRateLimiter,
  requireTrustedOrigin,
  validateRequest(firstAdminSetupSchema),
  authController.setupFirstAdmin,
);
router.post('/student/login', authRateLimiter, requireTrustedOrigin, validateRequest(loginSchema), authController.loginAsStudent);
router.post('/admin/login', authRateLimiter, requireTrustedOrigin, validateRequest(loginSchema), authController.loginAsAdmin);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', requireTrustedOrigin, authController.logout);

module.exports = router;
