const { sendError } = require('../utils/apiResponse');
const { ApiError } = require('../utils/ApiError');
const { Prisma } = require('@prisma/client');
const multer = require('multer');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} was not found`));
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error.type === 'entity.parse.failed') {
    sendError(res, { statusCode: 400, message: 'Request body contains invalid JSON.' });
    return;
  }

  if (error.type === 'entity.too.large') {
    sendError(res, { statusCode: 413, message: 'Request body exceeds the allowed size.' });
    return;
  }

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const isAcademicResource = req.baseUrl?.includes('/subjects');
    const isPortfolio = req.baseUrl?.includes('/portfolio');
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? isAcademicResource
        ? 'Academic PDF files must be 20 MB or smaller.'
        : isPortfolio
            ? 'Project screenshots must be 8 MB or smaller; portfolio PDFs must be 20 MB or smaller.'
        : 'Profile photos must be 5 MB or smaller.'
      : isAcademicResource
        ? 'The academic PDF upload could not be processed.'
        : isPortfolio
          ? 'The portfolio file upload could not be processed.'
        : 'The profile photo upload could not be processed.';
    sendError(res, { statusCode, message });
    return;
  }

  if (error.message === 'Upload a JPEG, PNG, or WebP image.') {
    sendError(res, { statusCode: 400, message: error.message });
    return;
  }
  if (error.message === 'Upload a PDF file for academic resources.') {
    sendError(res, { statusCode: 400, message: error.message });
    return;
  }
  if (
    error.message === 'Upload a JPEG, PNG, or WebP project screenshot.'
    || error.message === 'Upload a PDF certificate file.'
    || error.message === 'Upload a PDF resume file.'
  ) {
    sendError(res, { statusCode: 400, message: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    sendError(res, { statusCode: 409, message: 'A record with this value already exists.' });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    sendError(res, { statusCode: 409, message: 'This record is still referenced and cannot be changed or deleted.' });
    return;
  }

  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = statusCode >= 500 ? 'Internal server error.' : error.message;

  if (statusCode >= 500) {
    console.error('Unhandled API error', error);
  }

  sendError(res, {
    statusCode,
    message,
    errors: error instanceof ApiError ? error.details : undefined,
  });
}

module.exports = { notFoundHandler, errorHandler };
