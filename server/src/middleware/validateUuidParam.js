const { ApiError } = require('../utils/ApiError');

function validateUuidParam(name) {
  return (req, res, next) => {
    const value = req.params[name];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      next(new ApiError(400, `Invalid ${name}.`));
      return;
    }
    next();
  };
}

module.exports = { validateUuidParam };
