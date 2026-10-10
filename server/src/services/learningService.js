const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');

const toolKeys = new Set([
  'python',
  'jupyter-notebook',
  'numpy',
  'pandas',
  'matplotlib',
  'sql',
  'excel',
  'power-bi',
  'machine-learning',
]);

function optionalText(value) {
  return value === '' ? null : value;
}

async function listCodingProblems(ownerId, filters) {
  const { search, language, difficulty, status } = filters;
  const where = {
    ownerId,
    ...(language ? { language } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(status === 'completed' ? { isCompleted: true } : {}),
    ...(status === 'incomplete' ? { isCompleted: false } : {}),
    ...(status === 'bookmarked' ? { isBookmarked: true } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { statement: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const [problems, totalCount, completedCount, bookmarkedCount] = await prisma.$transaction([
    prisma.codingProblem.findMany({ where, orderBy: { updatedAt: 'desc' } }),
    prisma.codingProblem.count({ where: { ownerId } }),
    prisma.codingProblem.count({ where: { ownerId, isCompleted: true } }),
    prisma.codingProblem.count({ where: { ownerId, isBookmarked: true } }),
  ]);
  return {
    problems,
    progress: {
      totalCount,
      completedCount,
      bookmarkedCount,
      completionPercent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
    },
  };
}

async function createCodingProblem(ownerId, input) {
  const problem = await prisma.$transaction(async (tx) => {
    const created = await tx.codingProblem.create({
      data: {
        ownerId,
        title: input.title,
        statement: input.statement,
        language: input.language,
        topic: optionalText(input.topic),
        difficulty: input.difficulty,
        sourceUrl: optionalText(input.sourceUrl),
        solutionNotes: optionalText(input.solutionNotes),
      },
    });
    await tx.codingPracticeEvent.create({
      data: { ownerId, problemId: created.id, problemTitle: created.title, eventType: 'CREATED' },
    });
    return created;
  });
  return problem;
}

async function updateCodingProblem(ownerId, problemId, changes) {
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.codingProblem.findFirst({ where: { id: problemId, ownerId } });
    if (!current) throw new ApiError(404, 'Coding problem not found.');
    const data = {};
    for (const field of ['topic', 'sourceUrl', 'solutionNotes']) {
      if (changes[field] !== undefined) data[field] = optionalText(changes[field]);
    }
    for (const field of ['title', 'statement', 'language', 'difficulty', 'isCompleted', 'isBookmarked']) {
      if (changes[field] !== undefined) data[field] = changes[field];
    }
    if (changes.isCompleted !== undefined) {
      data.completedAt = changes.isCompleted ? (current.completedAt || new Date()) : null;
    }
    const updated = await tx.codingProblem.update({ where: { id: problemId }, data });
    const events = [];
    if (changes.isCompleted !== undefined && changes.isCompleted !== current.isCompleted) {
      events.push(changes.isCompleted ? 'COMPLETED' : 'REOPENED');
    }
    if (changes.isBookmarked !== undefined && changes.isBookmarked !== current.isBookmarked) {
      events.push(changes.isBookmarked ? 'BOOKMARKED' : 'UNBOOKMARKED');
    }
    if (changes.solutionNotes !== undefined && changes.solutionNotes !== current.solutionNotes) {
      events.push('NOTE_UPDATED');
    }
    if (events.length === 0) events.push('UPDATED');
    await tx.codingPracticeEvent.createMany({
      data: events.map((eventType) => ({
        ownerId,
        problemId,
        problemTitle: updated.title,
        eventType,
      })),
    });
    return updated;
  });
  return result;
}

async function deleteCodingProblem(ownerId, problemId) {
  await prisma.$transaction(async (tx) => {
    const problem = await tx.codingProblem.findFirst({
      where: { id: problemId, ownerId },
      select: { id: true, title: true },
    });
    if (!problem) throw new ApiError(404, 'Coding problem not found.');
    await tx.codingPracticeEvent.create({
      data: { ownerId, problemTitle: problem.title, eventType: 'DELETED' },
    });
    await tx.codingProblem.delete({ where: { id: problemId } });
  });
}

async function listCodingHistory(ownerId, limit = 30) {
  return prisma.codingPracticeEvent.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, problemTitle: true, eventType: true, createdAt: true },
  });
}

async function getToolProgress(ownerId, toolKey) {
  if (!toolKeys.has(toolKey)) throw new ApiError(404, 'Data science tool not found.');
  const progress = await prisma.learningProgress.findUnique({
    where: { ownerId_trackKey: { ownerId, trackKey: `tool:${toolKey}` } },
    select: { notes: true, isCompleted: true, percentComplete: true, updatedAt: true },
  });
  return progress || { notes: '', isCompleted: false, percentComplete: 0, updatedAt: null };
}

async function listToolProgress(ownerId) {
  const progressRecords = await prisma.learningProgress.findMany({
    where: { ownerId, trackKey: { startsWith: 'tool:' } },
    orderBy: { updatedAt: 'desc' },
    select: { trackKey: true, notes: true, isCompleted: true, percentComplete: true, updatedAt: true },
  });
  return progressRecords.map(({ trackKey, ...progress }) => ({
    toolKey: trackKey.slice('tool:'.length),
    ...progress,
  }));
}

async function saveToolProgress(ownerId, toolKey, changes) {
  if (!toolKeys.has(toolKey)) throw new ApiError(404, 'Data science tool not found.');
  const existing = await prisma.learningProgress.findUnique({
    where: { ownerId_trackKey: { ownerId, trackKey: `tool:${toolKey}` } },
  });
  const isCompleted = changes.isCompleted
    ?? (changes.percentComplete !== undefined ? changes.percentComplete === 100 : existing?.isCompleted ?? false);
  const percentComplete = isCompleted
    ? 100
    : (changes.percentComplete ?? (existing?.isCompleted ? 0 : existing?.percentComplete ?? 0));
  return prisma.learningProgress.upsert({
    where: { ownerId_trackKey: { ownerId, trackKey: `tool:${toolKey}` } },
    create: {
      ownerId,
      trackKey: `tool:${toolKey}`,
      notes: changes.notes ?? '',
      isCompleted,
      percentComplete,
    },
    update: {
      ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
      ...(changes.isCompleted !== undefined ? { isCompleted } : {}),
      ...(changes.percentComplete !== undefined || changes.isCompleted !== undefined ? { percentComplete } : {}),
    },
    select: { notes: true, isCompleted: true, percentComplete: true, updatedAt: true },
  });
}

async function getCloudLearning(ownerId) {
  const [progress, labNotes, certificates] = await prisma.$transaction([
    prisma.learningProgress.findUnique({
      where: { ownerId_trackKey: { ownerId, trackKey: 'aws-cloud' } },
      select: { notes: true, isCompleted: true, percentComplete: true, updatedAt: true },
    }),
    prisma.cloudLabNote.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } }),
    prisma.certificate.findMany({
      where: { ownerId, category: 'AWS_CLOUD' },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        title: true,
        issuer: true,
        issuedAt: true,
        credentialUrl: true,
        category: true,
        isPublic: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);
  return {
    progress: progress || { notes: '', isCompleted: false, percentComplete: 0, updatedAt: null },
    labNotes,
    certificates,
  };
}

async function saveCloudProgress(ownerId, changes) {
  const existing = await prisma.learningProgress.findUnique({
    where: { ownerId_trackKey: { ownerId, trackKey: 'aws-cloud' } },
  });
  const isCompleted = changes.isCompleted
    ?? (changes.percentComplete !== undefined ? changes.percentComplete === 100 : existing?.isCompleted ?? false);
  const percentComplete = isCompleted
    ? 100
    : (changes.percentComplete ?? (existing?.isCompleted ? 0 : existing?.percentComplete ?? 0));
  return prisma.learningProgress.upsert({
    where: { ownerId_trackKey: { ownerId, trackKey: 'aws-cloud' } },
    create: {
      ownerId,
      trackKey: 'aws-cloud',
      notes: changes.notes ?? '',
      isCompleted,
      percentComplete,
    },
    update: {
      ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
      ...(changes.isCompleted !== undefined ? { isCompleted } : {}),
      ...(changes.percentComplete !== undefined || changes.isCompleted !== undefined ? { percentComplete } : {}),
    },
    select: { notes: true, isCompleted: true, percentComplete: true, updatedAt: true },
  });
}

async function createCloudLabNote(ownerId, input) {
  return prisma.cloudLabNote.create({ data: { ownerId, ...input } });
}

async function updateCloudLabNote(ownerId, noteId, changes) {
  const result = await prisma.cloudLabNote.updateMany({
    where: { id: noteId, ownerId },
    data: changes,
  });
  if (result.count === 0) throw new ApiError(404, 'Cloud lab note not found.');
  return prisma.cloudLabNote.findFirst({ where: { id: noteId, ownerId } });
}

async function deleteCloudLabNote(ownerId, noteId) {
  const result = await prisma.cloudLabNote.deleteMany({ where: { id: noteId, ownerId } });
  if (result.count === 0) throw new ApiError(404, 'Cloud lab note not found.');
}

async function createCloudCertificate(ownerId, input) {
  return prisma.certificate.create({ data: { ...input, ownerId, category: 'AWS_CLOUD' } });
}

async function deleteCloudCertificate(ownerId, certificateId) {
  const certificate = await prisma.certificate.findFirst({
    where: { id: certificateId, ownerId, category: 'AWS_CLOUD' },
    select: { id: true },
  });
  if (!certificate) throw new ApiError(404, 'AWS certificate record not found.');
  await require('./portfolioService').deleteCertificate(ownerId, certificateId);
}

module.exports = {
  createCloudCertificate,
  createCloudLabNote,
  createCodingProblem,
  deleteCloudCertificate,
  deleteCloudLabNote,
  deleteCodingProblem,
  getCloudLearning,
  getToolProgress,
  listCodingHistory,
  listCodingProblems,
  listToolProgress,
  saveCloudProgress,
  saveToolProgress,
  updateCloudLabNote,
  updateCodingProblem,
};
