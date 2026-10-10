const { ApiError } = require('../utils/ApiError');

function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ApiError(
        400,
        'Request validation failed.',
        result.error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      ));
      return;
    }

    req.body = result.data;
    next();
  };
}

module.exports = { validateRequest };
