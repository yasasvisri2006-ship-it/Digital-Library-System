const { timingSafeEqual } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { UserRole } = require('@prisma/client');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

function setupKeyMatches(candidate) {
  if (!env.adminSetupKey || typeof candidate !== 'string') return false;
  const expected = Buffer.from(env.adminSetupKey);
  const supplied = Buffer.from(candidate);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

async function isAdminSetupAvailable() {
  if (!env.adminSetupKey || !['development', 'test'].includes(env.nodeEnv)) return false;
  const { prisma } = require('../config/prisma');
  return !(await prisma.user.findFirst({ where: { role: UserRole.ADMIN }, select: { id: true } }));
}

async function createFirstAdmin({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const { prisma } = require('../config/prisma');

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked WHERE pg_advisory_xact_lock(7300419202610101) IS NULL`;
      const existingAdmin = await tx.user.findFirst({ where: { role: UserRole.ADMIN }, select: { id: true } });
      if (existingAdmin) throw new ApiError(409, 'Administrator setup has already been completed.');
      return tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: UserRole.ADMIN,
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 'P2002') throw new ApiError(409, 'An account with that email already exists.');
    throw error;
  }
}

async function setupFirstAdmin({ setupKey, ...details }) {
  if (!env.adminSetupKey || !setupKeyMatches(setupKey)) {
    throw new ApiError(403, 'Administrator setup is not authorized.');
  }
  if (!['development', 'test'].includes(env.nodeEnv)) {
    throw new ApiError(403, 'Administrator setup is unavailable in this environment.');
  }
  return createFirstAdmin(details);
}

module.exports = { createFirstAdmin, isAdminSetupAvailable, setupFirstAdmin };
