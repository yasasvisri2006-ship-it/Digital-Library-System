const { sendError } = require('../utils/apiResponse');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      sendError(res, {
        statusCode: 403,
        message: 'You do not have permission to access this resource.',
      });
      return;
    }
    next();
  };
}

module.exports = { requireRole };
