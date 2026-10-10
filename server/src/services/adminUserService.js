const bcrypt = require('bcryptjs');
const { UserRole } = require('@prisma/client');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const profileService = require('./profileService');

const PAGE_SIZE_MAX = 50;
const studentInclude = { studentProfile: true };

function userView(user) {
  const profile = user.studentProfile;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    studentProfile: profile ? {
      studentId: profile.studentId,
      program: profile.program,
      department: profile.department,
      branch: profile.branch || profile.department,
      year: profile.year,
      semester: profile.semester,
      section: profile.section,
      phone: profile.phone,
      photoUrl: profile.photoPath ? `/admin/users/${user.id}/photo?v=${profile.updatedAt.getTime()}` : null,
      updatedAt: profile.updatedAt,
    } : null,
  };
}

function pageNumber(value, fallback) {
  const page = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new ApiError(400, 'Invalid pagination value.');
  return page;
}

function listFilter(query) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const department = typeof query.department === 'string' ? query.department.trim() : '';
  const status = query.status || 'ALL';
  if (search.length > 120 || department.length > 120) throw new ApiError(400, 'Search or department filter is too long.');
  if (!['ALL', 'ACTIVE', 'INACTIVE'].includes(status)) throw new ApiError(400, 'Invalid account status filter.');
  return {
    role: UserRole.STUDENT,
    ...(status !== 'ALL' ? { isActive: status === 'ACTIVE' } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentProfile: { is: { studentId: { contains: search, mode: 'insensitive' } } } },
      ],
    } : {}),
    ...(department ? {
      studentProfile: { is: { department: { equals: department, mode: 'insensitive' } } },
    } : {}),
  };
}

function profileData(input) {
  return {
    studentId: input.studentId,
    program: input.program || 'B.Tech',
    department: input.department || null,
    branch: input.branch || null,
    year: input.year || null,
    semester: input.semester || null,
    section: input.section || null,
    phone: input.phone || null,
  };
}

function duplicateError(error) {
  if (error.code !== 'P2002') return error;
  const target = (error.meta?.target || []).join(' ').toLowerCase();
  if (target.includes('studentid')) return new ApiError(409, 'That Student ID is already assigned to another account.');
  if (target.includes('email')) return new ApiError(409, 'An account with that email already exists.');
  return new ApiError(409, 'An account with one of those values already exists.');
}

async function createStudent(input, photo) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: UserRole.STUDENT,
        studentProfile: { create: profileData(input) },
      },
      include: studentInclude,
    });
  } catch (error) {
    throw duplicateError(error);
  }

  try {
    if (photo) await profileService.saveProfilePhoto(user.id, photo);
    return userView(await prisma.user.findUnique({ where: { id: user.id }, include: studentInclude }));
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
    throw error;
  }
}

async function listStudents(query) {
  const page = pageNumber(query.page, 1);
  const pageSize = pageNumber(query.pageSize, 20);
  if (pageSize > PAGE_SIZE_MAX) throw new ApiError(400, `Page size cannot exceed ${PAGE_SIZE_MAX}.`);
  const where = listFilter(query);
  const [users, total, departments] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: studentInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
    prisma.studentProfile.findMany({
      where: { user: { role: UserRole.STUDENT }, department: { not: null } },
      distinct: ['department'],
      select: { department: true },
      orderBy: { department: 'asc' },
    }),
  ]);
  return {
    users: users.map(userView),
    departments: departments.map(({ department }) => department),
    pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
  };
}

async function getStudent(userId) {
  const user = await prisma.user.findFirst({ where: { id: userId, role: UserRole.STUDENT }, include: studentInclude });
  if (!user) throw new ApiError(404, 'Student account not found.');
  return userView(user);
}

async function updateStudent(userId, changes) {
  const { name, email, ...profileChanges } = changes;
  try {
    await prisma.$transaction(async (tx) => {
      const student = await tx.user.findFirst({ where: { id: userId, role: UserRole.STUDENT }, select: { id: true } });
      if (!student) throw new ApiError(404, 'Student account not found.');
      const userChanges = {};
      if (name !== undefined) userChanges.name = name;
      if (email !== undefined) userChanges.email = email;
      if (Object.keys(userChanges).length) await tx.user.update({ where: { id: userId }, data: userChanges });
      if (Object.keys(profileChanges).length) await tx.studentProfile.update({ where: { userId }, data: profileChanges });
    });
  } catch (error) {
    throw duplicateError(error);
  }
  return getStudent(userId);
}

async function setStudentActive(userId, isActive, actorId) {
  if (userId === actorId) throw new ApiError(409, 'You cannot deactivate your own administrator account.');
  const result = await prisma.user.updateMany({
    where: { id: userId, role: UserRole.STUDENT },
    data: { isActive, tokenVersion: { increment: 1 } },
  });
  if (!result.count) throw new ApiError(404, 'Student account not found.');
  return getStudent(userId);
}

async function resetStudentPassword(userId, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.user.updateMany({
    where: { id: userId, role: UserRole.STUDENT },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  if (!result.count) throw new ApiError(404, 'Student account not found.');
  return getStudent(userId);
}

async function getStudentPhotoPath(userId) {
  await getStudent(userId);
  return profileService.getPhotoPath(userId);
}

async function updateStudentPhoto(userId, photo) {
  await getStudent(userId);
  return profileService.saveProfilePhoto(userId, photo);
}

module.exports = {
  createStudent,
  getStudent,
  getStudentPhotoPath,
  listStudents,
  resetStudentPassword,
  setStudentActive,
  updateStudent,
  updateStudentPhoto,
  userView,
};
