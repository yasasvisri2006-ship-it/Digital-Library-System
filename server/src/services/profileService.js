const path = require('node:path');
const { mkdir, unlink, writeFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');

const uploadDirectory = path.resolve(__dirname, '../../uploads/profile-photos');
const photoTypes = [
  {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    matches(buffer) {
      return buffer.length >= 3
        && buffer[0] === 0xff
        && buffer[1] === 0xd8
        && buffer[2] === 0xff;
    },
  },
  {
    mimeType: 'image/png',
    extension: 'png',
    matches(buffer) {
      return buffer.length >= 8
        && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    },
  },
  {
    mimeType: 'image/webp',
    extension: 'webp',
    matches(buffer) {
      return buffer.length >= 12
        && buffer.toString('ascii', 0, 4) === 'RIFF'
        && buffer.toString('ascii', 8, 12) === 'WEBP';
    },
  },
];

function toProfileResponse(user) {
  const { studentProfile } = user;
  if (!studentProfile) throw new ApiError(404, 'Student profile not found');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    studentId: studentProfile.studentId,
    program: studentProfile.program,
    department: studentProfile.department,
    branch: studentProfile.branch || studentProfile.department,
    year: studentProfile.year,
    semester: studentProfile.semester,
    section: studentProfile.section,
    phone: studentProfile.phone,
    photoUrl: studentProfile.photoPath
      ? `/profile/photo?v=${studentProfile.updatedAt.getTime()}`
      : null,
    updatedAt: studentProfile.updatedAt,
  };
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });
  if (!user) throw new ApiError(404, 'User not found');
  return toProfileResponse(user);
}

async function updateProfile(userId, changes) {
  const { name, studentId, program, department, branch, year, semester, section, phone } = changes;
  const profileChanges = { studentId, program, department, branch, year, semester, section, phone };
  for (const [key, value] of Object.entries(profileChanges)) {
    if (value === undefined) delete profileChanges[key];
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { name } });
      }
      if (Object.keys(profileChanges).length) {
        await tx.studentProfile.update({
          where: { userId },
          data: profileChanges,
        });
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'That student ID is already assigned to another student');
    }
    throw error;
  }

  return getProfile(userId);
}

async function saveProfilePhoto(userId, file) {
  if (!file) throw new ApiError(400, 'Choose a profile photo to upload.');

  const photoType = photoTypes.find((type) => (
    type.mimeType === file.mimetype && type.matches(file.buffer)
  ));
  if (!photoType) {
    throw new ApiError(400, 'The uploaded file is not a valid JPEG, PNG, or WebP image.');
  }

  const filename = `${randomUUID()}.${photoType.extension}`;
  const relativePath = path.join('profile-photos', filename);
  const absolutePath = path.join(uploadDirectory, filename);
  const previousProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { photoPath: true },
  });
  if (!previousProfile) throw new ApiError(404, 'Student profile not found');

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(absolutePath, file.buffer, { flag: 'wx', mode: 0o600 });

  try {
    const profile = await prisma.studentProfile.update({
      where: { userId },
      data: { photoPath: relativePath },
    });

    if (previousProfile.photoPath && previousProfile.photoPath !== relativePath) {
      const oldPath = path.resolve(__dirname, '../../uploads', previousProfile.photoPath);
      if (oldPath.startsWith(`${uploadDirectory}${path.sep}`)) {
        await unlink(oldPath).catch((error) => {
          if (error.code !== 'ENOENT') {
            console.error('Unable to remove previous profile photo', error);
          }
        });
      }
    }
  } catch (error) {
    await unlink(absolutePath).catch((unlinkError) => {
      if (unlinkError.code !== 'ENOENT') {
        console.error('Unable to remove a failed profile photo upload', unlinkError);
      }
    });
    if (error.code === 'P2025') throw new ApiError(404, 'Student profile not found');
    if (error.code === 'P2002') {
      throw new ApiError(409, 'That student ID is already assigned to another student');
    }
    throw error;
  }

  return getProfile(userId);
}

async function getPhotoPath(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { photoPath: true },
  });
  if (!profile?.photoPath) throw new ApiError(404, 'No profile photo has been uploaded');

  const photoPath = path.resolve(__dirname, '../../uploads', profile.photoPath);
  if (!photoPath.startsWith(`${uploadDirectory}${path.sep}`)) {
    throw new ApiError(404, 'Profile photo not found');
  }
  return photoPath;
}

module.exports = { getPhotoPath, getProfile, saveProfilePhoto, updateProfile };
