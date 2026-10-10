const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && env.clientOrigins.includes(origin)) {
    next();
    return;
  }

  next(new ApiError(403, 'A trusted browser origin is required for this request'));
}

module.exports = { requireTrustedOrigin };
