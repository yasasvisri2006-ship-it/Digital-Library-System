const path = require('node:path');
const { mkdir, unlink, writeFile } = require('node:fs/promises');
const { randomBytes, randomUUID } = require('node:crypto');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');

const imageTypes = [
  { mimeType: 'image/jpeg', extension: 'jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { mimeType: 'image/png', extension: 'png', matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mimeType: 'image/webp', extension: 'webp', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
];

function safeFilePath(relativePath) {
  const absolutePath = path.resolve(env.portfolioStorageDir, relativePath);
  if (!absolutePath.startsWith(`${env.portfolioStorageDir}${path.sep}`)) {
    throw new ApiError(404, 'Portfolio file not found.');
  }
  return absolutePath;
}

function safeName(originalName, fallback) {
  return path.basename(originalName).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || fallback;
}

function projectResponse(project) {
  return {
    ...project,
    screenshots: (project.screenshots || []).map((screenshot) => ({
      id: screenshot.id,
      fileName: screenshot.fileName,
      mimeType: screenshot.mimeType,
      fileSize: screenshot.fileSize,
      createdAt: screenshot.createdAt,
      url: `/portfolio/projects/${project.id}/screenshots/${screenshot.id}`,
    })),
  };
}

function certificateResponse(certificate) {
  const { filePath, ...safeCertificate } = certificate;
  return {
    ...safeCertificate,
    fileUrl: filePath ? `/portfolio/certificates/${certificate.id}/file` : null,
  };
}

async function listProjects(ownerId) {
  const projects = await prisma.project.findMany({
    where: { ownerId },
    include: { screenshots: { where: { ownerId }, orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });
  return projects.map(projectResponse);
}

async function createProject(ownerId, input) {
  const project = await prisma.project.create({
    data: {
      ownerId,
      title: input.title,
      description: input.description ?? null,
      status: input.status || 'PLANNING',
      repositoryUrl: input.repositoryUrl ?? null,
      demoUrl: input.demoUrl ?? null,
      techStack: input.techStack || [],
      documentation: input.documentation ?? null,
      isPublic: input.isPublic ?? false,
    },
  });
  return projectResponse(project);
}

async function updateProject(ownerId, projectId, changes) {
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId }, select: { id: true } });
  if (!project) throw new ApiError(404, 'Project not found.');
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: changes,
    include: { screenshots: { where: { ownerId }, orderBy: { createdAt: 'asc' } } },
  });
  return projectResponse(updated);
}

async function deleteProject(ownerId, projectId) {
  const files = await prisma.projectScreenshot.findMany({
    where: { ownerId, projectId },
    select: { filePath: true },
  });
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId }, select: { id: true } });
  if (!project) throw new ApiError(404, 'Project not found.');
  await prisma.project.delete({ where: { id: projectId } });
  await removeFiles(files.map(({ filePath }) => filePath));
}

async function saveProjectScreenshot(ownerId, projectId, file) {
  if (!file) throw new ApiError(400, 'Choose a project screenshot.');
  const imageType = imageTypes.find((type) => type.mimeType === file.mimetype && type.matches(file.buffer));
  if (!imageType) throw new ApiError(400, 'The screenshot must be a valid JPEG, PNG, or WebP image.');
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId }, select: { id: true } });
  if (!project) throw new ApiError(404, 'Project not found.');
  const filePath = `${ownerId}/projects/${randomUUID()}.${imageType.extension}`;
  const absolutePath = safeFilePath(filePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, file.buffer, { flag: 'wx', mode: 0o600 });
  try {
    const screenshot = await prisma.projectScreenshot.create({
      data: {
        ownerId,
        projectId,
        filePath,
        fileName: safeName(file.originalname, `project-screenshot.${imageType.extension}`),
        mimeType: imageType.mimeType,
        fileSize: file.size,
      },
    });
    return {
      id: screenshot.id,
      fileName: screenshot.fileName,
      mimeType: screenshot.mimeType,
      fileSize: screenshot.fileSize,
      createdAt: screenshot.createdAt,
      url: `/portfolio/projects/${projectId}/screenshots/${screenshot.id}`,
    };
  } catch (error) {
    await unlink(absolutePath).catch((cleanupError) => {
      if (cleanupError.code !== 'ENOENT') console.error('Unable to clean up a failed project screenshot upload', cleanupError);
    });
    throw error;
  }
}

async function getProjectScreenshot(ownerId, projectId, screenshotId) {
  const screenshot = await prisma.projectScreenshot.findFirst({
    where: { id: screenshotId, projectId, ownerId },
    select: { filePath: true, fileName: true, mimeType: true },
  });
  if (!screenshot) throw new ApiError(404, 'Project screenshot not found.');
  return { ...screenshot, path: safeFilePath(screenshot.filePath) };
}

async function getPublicProjectScreenshot(slug, projectId, screenshotId) {
  const screenshot = await prisma.projectScreenshot.findFirst({
    where: {
      id: screenshotId,
      projectId,
      project: { isPublic: true, owner: { resumeProfile: { is: { publicSlug: slug, isPublic: true } } } },
    },
    select: { filePath: true, fileName: true, mimeType: true },
  });
  if (!screenshot) throw new ApiError(404, 'Public portfolio screenshot not found.');
  return { ...screenshot, path: safeFilePath(screenshot.filePath) };
}

async function deleteProjectScreenshot(ownerId, projectId, screenshotId) {
  const screenshot = await prisma.projectScreenshot.findFirst({
    where: { id: screenshotId, projectId, ownerId },
    select: { id: true, filePath: true },
  });
  if (!screenshot) throw new ApiError(404, 'Project screenshot not found.');
  await prisma.projectScreenshot.delete({ where: { id: screenshotId } });
  await removeFiles([screenshot.filePath]);
}

async function removeFiles(relativePaths) {
  for (const relativePath of relativePaths) {
    await unlink(safeFilePath(relativePath)).catch((error) => {
      if (error.code !== 'ENOENT') console.error('Unable to remove a private portfolio file', error);
    });
  }
}

async function ensureResume(ownerId) {
  const existing = await prisma.resumeProfile.findUnique({ where: { ownerId } });
  if (existing) return existing;
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) throw new ApiError(404, 'Student profile not found.');
  try {
    return await prisma.resumeProfile.create({
      data: {
        ownerId,
        publicSlug: randomBytes(12).toString('hex'),
        displayName: user.name,
        email: user.email,
        phone: user.studentProfile.phone,
        education: [],
        internships: [],
        achievements: [],
      },
    });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    return prisma.resumeProfile.findUniqueOrThrow({ where: { ownerId } });
  }
}

async function getResume(ownerId) {
  const [resume, projects, certificates] = await Promise.all([
    ensureResume(ownerId),
    listProjects(ownerId),
    listCertificates(ownerId, {}),
  ]);
  return { resume, projects, certificates };
}

async function updateResume(ownerId, changes) {
  await ensureResume(ownerId);
  return prisma.resumeProfile.update({ where: { ownerId }, data: changes });
}

async function listCertificates(ownerId, { search, category } = {}) {
  const certificates = await prisma.certificate.findMany({
    where: {
      ownerId,
      ...(category ? { category } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { issuer: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
  });
  return certificates.map(certificateResponse);
}

async function createCertificate(ownerId, input) {
  const certificate = await prisma.certificate.create({
    data: {
      ownerId,
      title: input.title,
      issuer: input.issuer ?? null,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
      credentialUrl: input.credentialUrl ?? null,
      category: input.category || 'GENERAL',
      isPublic: input.isPublic ?? false,
    },
  });
  return certificateResponse(certificate);
}

async function updateCertificate(ownerId, certificateId, changes) {
  const certificate = await prisma.certificate.findFirst({
    where: { id: certificateId, ownerId },
    select: { id: true },
  });
  if (!certificate) throw new ApiError(404, 'Certificate not found.');
  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    data: { ...changes, ...(changes.issuedAt !== undefined ? { issuedAt: changes.issuedAt ? new Date(changes.issuedAt) : null } : {}) },
  });
  return certificateResponse(updated);
}

async function uploadCertificateFile(ownerId, certificateId, file) {
  if (!file || file.mimetype !== 'application/pdf' || !file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new ApiError(400, 'Choose a valid PDF certificate file.');
  }
  const certificate = await prisma.certificate.findFirst({
    where: { id: certificateId, ownerId },
    select: { id: true, filePath: true },
  });
  if (!certificate) throw new ApiError(404, 'Certificate not found.');
  const filePath = `${ownerId}/certificates/${randomUUID()}.pdf`;
  const absolutePath = safeFilePath(filePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, file.buffer, { flag: 'wx', mode: 0o600 });
  try {
    const updated = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        filePath,
        fileName: safeName(file.originalname, 'certificate.pdf'),
        fileSize: file.size,
      },
    });
    await removeFiles(certificate.filePath ? [certificate.filePath] : []);
    return certificateResponse(updated);
  } catch (error) {
    await removeFiles([filePath]);
    throw error;
  }
}

async function getCertificateFile(ownerId, certificateId) {
  const certificate = await prisma.certificate.findFirst({
    where: { id: certificateId, ownerId, filePath: { not: null } },
    select: { filePath: true, fileName: true },
  });
  if (!certificate) throw new ApiError(404, 'Certificate file not found.');
  return { ...certificate, path: safeFilePath(certificate.filePath) };
}

async function getPublicCertificateFile(slug, certificateId) {
  const certificate = await prisma.certificate.findFirst({
    where: {
      id: certificateId,
      isPublic: true,
      filePath: { not: null },
      owner: { resumeProfile: { is: { publicSlug: slug, isPublic: true } } },
    },
    select: { filePath: true, fileName: true },
  });
  if (!certificate) throw new ApiError(404, 'Public certificate file not found.');
  return { ...certificate, path: safeFilePath(certificate.filePath) };
}

async function deleteCertificate(ownerId, certificateId) {
  const certificate = await prisma.certificate.findFirst({
    where: { id: certificateId, ownerId },
    select: { id: true, filePath: true },
  });
  if (!certificate) throw new ApiError(404, 'Certificate not found.');
  await prisma.certificate.delete({ where: { id: certificateId } });
  if (certificate.filePath) await removeFiles([certificate.filePath]);
}

async function publicPortfolio(slug) {
  const resume = await prisma.resumeProfile.findFirst({
    where: { publicSlug: slug, isPublic: true },
    include: {
      owner: {
        select: {
          projects: {
            where: { isPublic: true },
            include: { screenshots: { orderBy: { createdAt: 'asc' } } },
            orderBy: { updatedAt: 'desc' },
          },
          certificates: {
            where: { isPublic: true },
            orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
          },
        },
      },
    },
  });
  if (!resume) throw new ApiError(404, 'Public portfolio not found.');
  const sections = new Set(resume.publicSections);
  const publicResume = {
    displayName: resume.displayName || 'Student portfolio',
    summary: sections.has('summary') ? resume.summary : '',
    contact: sections.has('contact') ? {
      email: resume.email,
      phone: resume.phone,
      location: resume.location,
    } : null,
    education: sections.has('education') ? resume.education : [],
    skills: sections.has('skills') ? resume.skills : [],
    internships: sections.has('internships') ? resume.internships : [],
    achievements: sections.has('achievements') ? resume.achievements : [],
    social: sections.has('social') ? {
      linkedInUrl: resume.linkedInUrl,
      githubUrl: resume.githubUrl,
      portfolioUrl: resume.portfolioUrl,
    } : null,
  };
  return {
    resume: publicResume,
    projects: resume.owner.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      repositoryUrl: project.repositoryUrl,
      demoUrl: project.demoUrl,
      techStack: project.techStack,
      documentation: project.documentation,
      screenshots: project.screenshots.map((screenshot) => ({
        id: screenshot.id,
        fileName: screenshot.fileName,
        mimeType: screenshot.mimeType,
        url: `/public/portfolio/${slug}/projects/${project.id}/screenshots/${screenshot.id}`,
      })),
    })),
    certificates: resume.owner.certificates.map(({ id, title, issuer, issuedAt, credentialUrl, filePath, fileName }) => ({
      id,
      title,
      issuer,
      issuedAt,
      credentialUrl,
      fileUrl: filePath ? `/public/portfolio/${slug}/certificates/${id}/file` : null,
      fileName,
    })),
  };
}

async function listCareer(ownerId) {
  const [applications, resources] = await prisma.$transaction([
    prisma.careerApplication.findMany({ where: { ownerId }, orderBy: [{ appliedAt: 'desc' }, { updatedAt: 'desc' }] }),
    prisma.careerResource.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } }),
  ]);
  return { applications, resources };
}

async function createCareerApplication(ownerId, input) {
  return prisma.careerApplication.create({
    data: {
      ...input,
      ownerId,
      appliedAt: input.appliedAt ? new Date(input.appliedAt) : null,
      notes: input.notes ?? null,
      jobUrl: input.jobUrl ?? null,
    },
  });
}

async function updateCareerApplication(ownerId, applicationId, changes) {
  const current = await prisma.careerApplication.findFirst({ where: { id: applicationId, ownerId }, select: { id: true } });
  if (!current) throw new ApiError(404, 'Internship application not found.');
  return prisma.careerApplication.update({
    where: { id: applicationId },
    data: {
      ...changes,
      ...(changes.appliedAt !== undefined ? { appliedAt: changes.appliedAt ? new Date(changes.appliedAt) : null } : {}),
    },
  });
}

async function deleteCareerApplication(ownerId, applicationId) {
  const result = await prisma.careerApplication.deleteMany({ where: { id: applicationId, ownerId } });
  if (result.count === 0) throw new ApiError(404, 'Internship application not found.');
}

async function createCareerResource(ownerId, input) {
  return prisma.careerResource.create({ data: { ...input, ownerId, url: input.url ?? null, notes: input.notes ?? null } });
}

async function updateCareerResource(ownerId, resourceId, changes) {
  const current = await prisma.careerResource.findFirst({ where: { id: resourceId, ownerId }, select: { id: true } });
  if (!current) throw new ApiError(404, 'Career resource not found.');
  return prisma.careerResource.update({
    where: { id: resourceId },
    data: { ...changes, ...(changes.url !== undefined ? { url: changes.url ?? null } : {}), ...(changes.notes !== undefined ? { notes: changes.notes ?? null } : {}) },
  });
}

async function deleteCareerResource(ownerId, resourceId) {
  const result = await prisma.careerResource.deleteMany({ where: { id: resourceId, ownerId } });
  if (result.count === 0) throw new ApiError(404, 'Career resource not found.');
}

module.exports = {
  createCareerApplication,
  createCareerResource,
  createCertificate,
  createProject,
  deleteCareerApplication,
  deleteCareerResource,
  deleteCertificate,
  deleteProject,
  deleteProjectScreenshot,
  getCertificateFile,
  getProjectScreenshot,
  getPublicCertificateFile,
  getPublicProjectScreenshot,
  getResume,
  listCareer,
  listCertificates,
  listProjects,
  publicPortfolio,
  saveProjectScreenshot,
  updateCareerApplication,
  updateCareerResource,
  updateCertificate,
  updateProject,
  updateResume,
  uploadCertificateFile,
};
