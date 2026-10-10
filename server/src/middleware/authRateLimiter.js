const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    sendError(res, {
      statusCode: 429,
      message: 'Too many sign-in attempts. Please wait and try again.',
    });
  },
});

module.exports = { authRateLimiter };
