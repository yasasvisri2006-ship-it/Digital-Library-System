const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');

function toPublicUser(user) {
  const profile = user.studentProfile;
  const photoUrl = profile?.photoPath
    ? `/profile/photo?v=${profile.updatedAt.getTime()}`
    : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    createdAt: user.createdAt,
    studentProfile: profile
      ? {
        studentId: profile.studentId,
        program: profile.program,
        department: profile.department,
        branch: profile.branch || profile.department,
        year: profile.year,
        semester: profile.semester,
        section: profile.section,
        phone: profile.phone,
        photoUrl,
        updatedAt: profile.updatedAt,
      }
      : null,
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: '1h' },
  );
}

async function login({ identity, password }, expectedRole) {
  const normalizedIdentity = identity.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedIdentity.toLowerCase() },
        { studentProfile: { is: { studentId: normalizedIdentity } } },
      ],
    },
    include: { studentProfile: true },
  });
  const passwordMatches = user
    ? user.isActive
      && user.role === expectedRole
      && await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return {
    token: createToken(user),
    user: toPublicUser(user),
  };
}

async function getPublicUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });
  return user ? toPublicUser(user) : null;
}

async function revokeSessions(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

async function revokeToken(token) {
  if (!token) return;
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) return;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, tokenVersion: true },
  });
  if (user && user.tokenVersion === decoded.tokenVersion) {
    await revokeSessions(user.id);
  }
}

module.exports = { getPublicUser, login, revokeSessions, revokeToken, toPublicUser };
