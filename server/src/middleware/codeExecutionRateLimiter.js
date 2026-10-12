const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const codeExecutionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator(req) {
    return req.auth.id;
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    sendError(res, {
      statusCode: 429,
      message: 'Too many code executions. Please wait a minute and try again.',
    });
  },
});

module.exports = { codeExecutionRateLimiter };
