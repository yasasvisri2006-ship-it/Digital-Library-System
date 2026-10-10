const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    sendError(res, {
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    });
  },
});

module.exports = { apiRateLimiter };
