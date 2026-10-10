function sendSuccess(res, { statusCode = 200, message, data = null }) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, { statusCode = 500, message, errors }) {
  const response = {
    success: false,
    message,
    data: null,
  };
  if (errors) response.errors = errors;

  return res.status(statusCode).json(response);
}

module.exports = { sendError, sendSuccess };
