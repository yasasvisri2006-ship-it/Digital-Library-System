const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { sendError } = require('../utils/apiResponse');

function authenticate(req, res, next) {
  const token = req.cookies?.mbu_session;
  if (!token) {
    sendError(res, { statusCode: 401, message: 'Authentication token is missing.' });
    return;
  }

  jwt.verify(token, env.jwtSecret, async (error, decoded) => {
    if (error) {
      sendError(res, { statusCode: 401, message: 'Invalid or expired session.' });
      return;
    }

    try {
      const { prisma } = require('../config/prisma');
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, isActive: true, tokenVersion: true },
      });
      if (!user || !user.isActive || user.tokenVersion !== decoded.tokenVersion) {
        sendError(res, { statusCode: 401, message: 'Session has expired. Please sign in again.' });
        return;
      }

      req.auth = { id: user.id, email: user.email, role: user.role };
      next();
    } catch (databaseError) {
      next(databaseError);
    }
  });
}

module.exports = { authenticate };
