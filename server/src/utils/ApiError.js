class ApiError extends Error {
  constructor(statusCode, message, details, { exposeMessage = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.exposeMessage = exposeMessage;
  }
}

module.exports = { ApiError };
