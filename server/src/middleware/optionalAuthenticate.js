const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');

function optionalAuthenticate(req, res, next) {
  const token = req.cookies?.mbu_session;
  if (!token) {
    next();
    return;
  }

  jwt.verify(token, env.jwtSecret, async (error, decoded) => {
    if (error) {
      next();
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true, isActive: true, tokenVersion: true },
      });
      if (user?.isActive && user.tokenVersion === decoded.tokenVersion) {
        req.auth = { id: user.id, email: user.email, role: user.role };
      }
      next();
    } catch (databaseError) {
      next(databaseError);
    }
  });
}

module.exports = { optionalAuthenticate };
