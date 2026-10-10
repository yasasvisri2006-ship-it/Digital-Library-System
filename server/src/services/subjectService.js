const path = require('node:path');
const { access, mkdir, unlink, writeFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');

const demoSubjects = [
  ['DEMO-DBMS', 'Database Management Systems'],
  ['DEMO-PYTHON', 'Python Programming'],
  ['DEMO-DSA', 'Data Structures'],
  ['DEMO-ML', 'Machine Learning'],
  ['DEMO-DATA-ANALYTICS', 'Data Analytics'],
  ['DEMO-CN', 'Computer Networks'],
];

function normalizeOptionalText(value) {
  return value === '' ? null : value;
}

function subjectSummary(subject) {
  const resources = subject.resources || [];
  const reviewedCount = resources.filter((resource) => resource.isReviewed).length;
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    description: subject.description,
    semester: subject.semester,
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
    resourceCount: resources.length,
    reviewedResourceCount: reviewedCount,
    progressPercent: resources.length ? Math.round((reviewedCount / resources.length) * 100) : 0,
  };
}

function resourceResponse(resource) {
  return {
    id: resource.id,
    subjectId: resource.subjectId,
    title: resource.title,
    description: resource.description,
    type: resource.type,
    url: resource.url,
    fileName: resource.fileName,
    fileSize: resource.fileSize,
    isReviewed: resource.isReviewed,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

function resourceInclude(ownerId) {
  return {
    resources: {
      where: { ownerId },
      select: { id: true, isReviewed: true },
    },
  };
}

function storagePathFor(relativePath) {
  const resolved = path.resolve(env.academicResourceStorageDir, relativePath);
  if (!resolved.startsWith(`${env.academicResourceStorageDir}${path.sep}`)) {
    throw new ApiError(404, 'Academic resource file was not found.');
  }
  return resolved;
}

async function listSubjects(userId, { search, semester } = {}) {
  const subjects = await prisma.subject.findMany({
    where: {
      ownerId: userId,
      ...(semester ? { semester } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: resourceInclude(userId),
    orderBy: [{ semester: 'asc' }, { name: 'asc' }],
  });
  return subjects.map(subjectSummary);
}

async function getSubject(userId, subjectId) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, ownerId: userId },
    include: {
      resources: {
        where: { ownerId: userId },
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      },
      _count: { select: { resources: true } },
    },
  });
  if (!subject) throw new ApiError(404, 'Subject not found.');
  return {
    ...subjectSummary({
      ...subject,
      resources: subject.resources,
    }),
    resources: subject.resources.map(resourceResponse),
  };
}

async function createSubject(userId, input) {
  const data = {
    ownerId: userId,
    name: input.name,
    code: normalizeOptionalText(input.code),
    description: normalizeOptionalText(input.description),
    semester: normalizeOptionalText(input.semester),
  };
  try {
    const subject = await prisma.subject.create({
      data,
      include: resourceInclude(userId),
    });
    return subjectSummary(subject);
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'That subject code is already in your subject list.');
    throw error;
  }
}

async function addDemoSubjects(userId) {
  await prisma.$transaction(
    demoSubjects.map(([code, name]) => prisma.subject.upsert({
      where: { ownerId_code: { ownerId: userId, code } },
      update: {},
      create: {
        ownerId: userId,
        code,
        name: `${name} (DEMO)`,
        description: 'Optional placeholder subject. Verify it against your official MBU syllabus; no faculty-approved content is included.',
      },
    })),
  );
  return listSubjects(userId);
}

async function updateSubject(userId, subjectId, changes) {
  const current = await prisma.subject.findFirst({
    where: { id: subjectId, ownerId: userId },
  });
  if (!current) throw new ApiError(404, 'Subject not found.');

  const data = {};
  for (const field of ['code', 'description', 'semester']) {
    if (changes[field] !== undefined) data[field] = normalizeOptionalText(changes[field]);
  }
  if (changes.name !== undefined) data.name = changes.name;
  try {
    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data,
      include: resourceInclude(userId),
    });
    return subjectSummary(subject);
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'That subject code is already in your subject list.');
    throw error;
  }
}

async function deleteSubject(userId, subjectId) {
  const resources = await prisma.academicResource.findMany({
    where: { ownerId: userId, subjectId },
    select: { filePath: true },
  });
  await prisma.$transaction(async (tx) => {
    const subject = await tx.subject.findFirst({ where: { id: subjectId, ownerId: userId }, select: { id: true } });
    if (!subject) throw new ApiError(404, 'Subject not found.');
    await tx.academicResource.deleteMany({ where: { ownerId: userId, subjectId } });
    await tx.subject.delete({ where: { id: subjectId } });
  });
  await removeStoredFiles(resources.map(({ filePath }) => filePath));
}

async function createResource(userId, subjectId, input) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, ownerId: userId },
    select: { id: true },
  });
  if (!subject) throw new ApiError(404, 'Subject not found.');
  const resource = await prisma.academicResource.create({
    data: {
      ownerId: userId,
      subjectId,
      title: input.title,
      description: normalizeOptionalText(input.description),
      type: input.type,
      url: normalizeOptionalText(input.url),
    },
  });
  return resourceResponse(resource);
}

async function saveResourceFile(userId, subjectId, input, file) {
  if (!file) throw new ApiError(400, 'Choose a PDF file to upload.');
  if (file.mimetype !== 'application/pdf'
    || !file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new ApiError(400, 'The uploaded file is not a valid PDF.');
  }
  if (!['SYLLABUS', 'NOTES', 'SLIDES', 'DOCUMENT', 'ASSIGNMENT'].includes(input.type)) {
    throw new ApiError(400, 'Uploaded PDFs must be syllabus, notes, slides, document, or assignment resources.');
  }
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, ownerId: userId },
    select: { id: true },
  });
  if (!subject) throw new ApiError(404, 'Subject not found.');

  const filePath = `${randomUUID()}.pdf`;
  const absolutePath = storagePathFor(filePath);
  const fileName = path.basename(file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'academic-resource.pdf';
  await mkdir(env.academicResourceStorageDir, { recursive: true });
  await writeFile(absolutePath, file.buffer, { flag: 'wx', mode: 0o600 });
  try {
    const resource = await prisma.academicResource.create({
      data: {
        ownerId: userId,
        subjectId,
        title: input.title,
        description: normalizeOptionalText(input.description),
        type: input.type,
        filePath,
        fileName,
        fileSize: file.size,
      },
    });
    return resourceResponse(resource);
  } catch (error) {
    await unlink(absolutePath).catch((cleanupError) => {
      if (cleanupError.code !== 'ENOENT') console.error('Unable to remove failed academic resource upload', cleanupError);
    });
    throw error;
  }
}

async function updateResource(userId, resourceId, changes) {
  const current = await prisma.academicResource.findFirst({
    where: { id: resourceId, ownerId: userId },
  });
  if (!current) throw new ApiError(404, 'Academic resource not found.');

  if (current.filePath && changes.type && !['SYLLABUS', 'NOTES', 'SLIDES', 'DOCUMENT', 'ASSIGNMENT'].includes(changes.type)) {
    throw new ApiError(400, 'Uploaded PDF resource type is not supported.');
  }
  if (current.filePath && changes.url) throw new ApiError(400, 'Uploaded file resources cannot be changed to external links.');
  if (!current.filePath && changes.type && ['LINK', 'REFERENCE'].includes(changes.type) && !changes.url && !current.url) {
    throw new ApiError(400, 'A URL is required for links and references.');
  }
  if (!current.filePath && changes.type && !['LINK', 'REFERENCE'].includes(changes.type) && changes.url) {
    throw new ApiError(400, 'Use a link/reference resource for external URLs.');
  }

  const data = { ...changes };
  for (const field of ['description', 'url']) {
    if (data[field] !== undefined) data[field] = normalizeOptionalText(data[field]);
  }
  const resource = await prisma.academicResource.update({
    where: { id: resourceId },
    data,
  });
  return resourceResponse(resource);
}

async function getDownload(userId, resourceId) {
  const resource = await prisma.academicResource.findFirst({
    where: { id: resourceId, ownerId: userId, filePath: { not: null } },
    select: { filePath: true, fileName: true },
  });
  if (!resource) throw new ApiError(404, 'Academic resource file not found.');
  const filePath = storagePathFor(resource.filePath);
  try {
    await access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') throw new ApiError(404, 'Academic resource file not found.');
    throw error;
  }
  return { path: filePath, fileName: resource.fileName || 'academic-resource.pdf' };
}

async function deleteResource(userId, resourceId) {
  const resource = await prisma.academicResource.findFirst({
    where: { id: resourceId, ownerId: userId },
    select: { id: true, filePath: true },
  });
  if (!resource) throw new ApiError(404, 'Academic resource not found.');
  await prisma.academicResource.delete({ where: { id: resourceId } });
  await removeStoredFiles([resource.filePath]);
}

async function removeStoredFiles(filePaths) {
  for (const filePath of filePaths.filter(Boolean)) {
    try {
      await unlink(storagePathFor(filePath));
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('Unable to remove deleted academic resource file', error);
    }
  }
}

module.exports = {
  addDemoSubjects,
  createResource,
  createSubject,
  deleteResource,
  deleteSubject,
  getDownload,
  getSubject,
  listSubjects,
  saveResourceFile,
  updateSubject,
  updateResource,
};
