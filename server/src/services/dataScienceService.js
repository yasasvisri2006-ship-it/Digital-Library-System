const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { access, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { pathToFileURL } = require('node:url');
const JSZip = require('jszip');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const privateFileStorage = require('./privateFileStorage');
const { ApiError } = require('../utils/ApiError');

const execFileAsync = promisify(execFile);
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const maximumConvertedSize = 100 * 1024 * 1024;
const officeExtensions = new Set(['ppt', 'pptx', 'doc', 'docx']);
const mimeTypes = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  ipynb: 'application/x-ipynb+json',
};

function materialResponse(material) {
  return {
    id: material.id,
    moduleId: material.moduleId,
    title: material.title,
    originalFileName: material.originalFileName,
    fileType: material.fileType,
    mimeType: material.mimeType,
    fileSize: material.fileSize,
    uploadedAt: material.createdAt,
    isPublished: material.isPublished,
    canRead: ['PDF', 'TXT', 'IPYNB'].includes(material.fileType) || Boolean(material.readerFilePath),
    previewError: material.readerError,
  };
}

function moduleResponse(module, { canManage = false, publicOnly = false } = {}) {
  const materials = module.materials || [];
  return {
    id: module.id,
    number: module.number,
    title: module.title,
    isPublic: module.isPublic,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
    canManage,
    materials: materials
      .filter((material) => !publicOnly || canManage || material.isPublished)
      .map(materialResponse),
  };
}

async function listModules(ownerId) {
  const modules = await prisma.dataScienceModule.findMany({
    where: { ownerId },
    include: { materials: { orderBy: { createdAt: 'asc' } } },
    orderBy: { number: 'asc' },
  });
  return modules.map((module) => moduleResponse(module, { canManage: true }));
}

async function listPublicModules(viewerId) {
  const modules = await prisma.dataScienceModule.findMany({
    where: { isPublic: true },
    include: {
      materials: { orderBy: { createdAt: 'asc' } },
      owner: { select: { role: true } },
    },
    orderBy: { number: 'asc' },
  });
  return modules.map((module) => moduleResponse(module, {
    canManage: Boolean(viewerId) && module.ownerId === viewerId && module.owner?.role === 'STUDENT',
    publicOnly: true,
  }));
}

async function createModule(ownerId) {
  await prisma.user.updateMany({
    where: { id: ownerId, dataScienceModulesInitialized: false },
    data: { dataScienceModulesInitialized: true },
  });
  const highest = await prisma.dataScienceModule.findFirst({
    where: { ownerId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const number = (highest?.number || 0) + 1;
  const module = await prisma.dataScienceModule.create({
    data: { ownerId, number, title: `Module ${String(number).padStart(2, '0')}` },
    include: { materials: true },
  });
  return moduleResponse(module, { canManage: true });
}

async function updateModule(ownerId, moduleId, title) {
  const result = await prisma.dataScienceModule.updateMany({
    where: { id: moduleId, ownerId },
    data: { title },
  });
  if (result.count === 0) throw new ApiError(404, 'Data Science module not found.');
  const module = await prisma.dataScienceModule.findFirst({
    where: { id: moduleId, ownerId },
    include: { materials: { orderBy: { createdAt: 'asc' } } },
  });
  return moduleResponse(module, { canManage: true });
}

async function assertOwnedModule(ownerId, moduleId) {
  const module = await prisma.dataScienceModule.findFirst({
    where: { id: moduleId, ownerId },
    select: { id: true },
  });
  if (!module) throw new ApiError(404, 'Data Science module not found.');
}

function safeOriginalFileName(fileName) {
  return path.basename(fileName.replace(/[\\/]/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'study-material';
}

async function validateFile(file) {
  if (!file) throw new ApiError(400, 'Choose a study material to upload.');
  const extension = path.extname(file.originalname).slice(1).toLowerCase();
  if (!Object.hasOwn(mimeTypes, extension)) {
    throw new ApiError(400, 'Choose a PPT, PPTX, PDF, DOC, DOCX, TXT, or IPYNB file.');
  }
  if (file.size > MAX_UPLOAD_SIZE) throw new ApiError(413, 'Study materials must be 50 MB or smaller.');

  if (extension === 'pdf' && !file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new ApiError(400, 'The uploaded file is not a valid PDF.');
  }
  if (['ppt', 'doc'].includes(extension)
    && !file.buffer.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'))) {
    throw new ApiError(400, `The uploaded file is not a valid .${extension} document.`);
  }
  if (['pptx', 'docx'].includes(extension)) {
    if (!file.buffer.subarray(0, 4).equals(Buffer.from('504B0304', 'hex'))) {
      throw new ApiError(400, `The uploaded file is not a valid .${extension} document.`);
    }
    let archive;
    try {
      archive = await JSZip.loadAsync(file.buffer);
    } catch {
      throw new ApiError(400, `The uploaded file is not a valid .${extension} document.`);
    }
    const requiredEntry = extension === 'pptx' ? 'ppt/presentation.xml' : 'word/document.xml';
    if (!archive.file('[Content_Types].xml') || !archive.file(requiredEntry)) {
      throw new ApiError(400, `The uploaded file is not a valid .${extension} document.`);
    }
  }
  if (extension === 'txt') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    } catch {
      throw new ApiError(400, 'The uploaded TXT file must contain valid UTF-8 text.');
    }
  }
  if (extension === 'ipynb') {
    let notebook;
    try {
      notebook = JSON.parse(file.buffer.toString('utf8'));
    } catch {
      throw new ApiError(400, 'The uploaded IPYNB file must contain valid notebook JSON.');
    }
    if (!Array.isArray(notebook.cells) || !Number.isInteger(notebook.nbformat)) {
      throw new ApiError(400, 'The uploaded IPYNB file must contain a valid Jupyter notebook.');
    }
  }
  return extension;
}

async function convertOfficeDocument(file, extension) {
  const workingDirectory = await mkdtemp(path.join(os.tmpdir(), 'mbu-document-conversion-'));
  const inputName = `source.${extension}`;
  const outputPath = path.join(workingDirectory, 'source.pdf');
  try {
    await writeFile(path.join(workingDirectory, inputName), file.buffer, { mode: 0o600 });
    try {
      await execFileAsync(
        env.libreOfficePath || 'soffice',
        [
          '--headless',
          `-env:UserInstallation=${pathToFileURL(path.join(workingDirectory, 'profile')).href}`,
          '--convert-to',
          'pdf',
          '--outdir',
          workingDirectory,
          path.join(workingDirectory, inputName),
        ],
        { timeout: 90_000, maxBuffer: 1024 * 1024, windowsHide: true },
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new ApiError(503, 'Office preview conversion is unavailable. Install LibreOffice on the server and set LIBREOFFICE_PATH if needed.');
      }
      if (error.killed) {
        throw new ApiError(422, 'Office preview conversion timed out. Try a smaller or simpler presentation.');
      }
      throw new ApiError(422, 'This Office file could not be converted to a readable PDF. Check the file and try again.');
    }
    try {
      await access(outputPath);
    } catch {
      throw new ApiError(422, 'This Office file did not produce a readable PDF. Check the file and try again.');
    }
    const pdf = await readFile(outputPath);
    if (pdf.length < 5 || pdf.length > maximumConvertedSize || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new ApiError(422, 'The converted PDF is empty, too large, or invalid.');
    }
    return pdf;
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function uploadMaterial(ownerId, moduleId, title, file, isPublished = false) {
  const extension = await validateFile(file);
  await assertOwnedModule(ownerId, moduleId);

  const id = randomUUID();
  const originalFileName = safeOriginalFileName(file.originalname);
  const filePath = `data-science/${moduleId}/${id}.${extension}`;
  const readerFilePath = extension === 'pdf'
    ? null
    : officeExtensions.has(extension)
      ? `data-science/${moduleId}/${id}.reader.pdf`
      : null;
  await privateFileStorage.store(env.academicResourceStorageDir, filePath, file.buffer, mimeTypes[extension]);
  let readerPdf = null;
  let readerError = null;
  if (officeExtensions.has(extension)) {
    try {
      readerPdf = await convertOfficeDocument(file, extension);
    } catch (error) {
      if (!(error instanceof ApiError) || ![422, 503].includes(error.statusCode)) {
        await privateFileStorage.remove(env.academicResourceStorageDir, filePath).catch((cleanupError) => {
          console.error('Unable to remove a failed Data Science upload', cleanupError);
        });
        throw error;
      }
      readerError = error.message;
    }
  }
  if (readerPdf) {
    try {
      await privateFileStorage.store(env.academicResourceStorageDir, readerFilePath, readerPdf, 'application/pdf');
    } catch (error) {
      await removeStoredFiles([filePath, readerFilePath]).catch((cleanupError) => {
        console.error('Unable to remove a partially stored Data Science upload', cleanupError);
      });
      throw error;
    }
  }

  try {
    const material = await prisma.dataScienceMaterial.create({
      data: {
        id,
        ownerId,
        moduleId,
        title,
        originalFileName,
        fileType: extension.toUpperCase(),
        mimeType: mimeTypes[extension],
        fileSize: file.size,
        filePath,
        readerFilePath: readerPdf ? readerFilePath : null,
        readerError,
        isPublished: Boolean(isPublished),
      },
    });
    return materialResponse(material);
  } catch (error) {
    await removeStoredFiles([filePath, readerFilePath]);
    throw error;
  }
}

async function updateMaterial(ownerId, materialId, changes) {
  const result = await prisma.dataScienceMaterial.updateMany({
    where: { id: materialId, ownerId },
    data: changes,
  });
  if (result.count === 0) throw new ApiError(404, 'Study material not found.');
  const material = await prisma.dataScienceMaterial.findFirst({ where: { id: materialId, ownerId } });
  return materialResponse(material);
}

async function getMaterialFile(ownerId, moduleId, materialId, preview = false) {
  const material = await prisma.dataScienceMaterial.findFirst({
    where: { id: materialId, moduleId, ownerId },
    select: {
      filePath: true,
      readerFilePath: true,
      originalFileName: true,
      fileType: true,
      mimeType: true,
      readerError: true,
    },
  });
  if (!material) throw new ApiError(404, 'Study material not found.');
  if (preview && material.readerError) throw new ApiError(415, material.readerError);
  const filePath = preview
    ? material.readerFilePath || (['PDF', 'TXT', 'IPYNB'].includes(material.fileType) ? material.filePath : null)
    : material.filePath;
  if (!filePath) throw new ApiError(415, 'This file type cannot be previewed in the reader. Download the original file to open it.');
  const stream = await privateFileStorage.open(env.academicResourceStorageDir, filePath);
  return {
    stream,
    fileName: material.originalFileName,
    mimeType: preview && filePath !== material.filePath ? 'application/pdf' : material.mimeType,
    inlineFileName: preview && filePath !== material.filePath ? `${path.parse(material.originalFileName).name}.pdf` : material.originalFileName,
  };
}

async function getPublicMaterialFile(moduleId, materialId, preview = false) {
  const material = await prisma.dataScienceMaterial.findFirst({
    where: {
      id: materialId,
      moduleId,
      isPublished: true,
      module: { isPublic: true },
    },
    select: {
      filePath: true,
      readerFilePath: true,
      originalFileName: true,
      fileType: true,
      mimeType: true,
      readerError: true,
    },
  });
  if (!material) throw new ApiError(404, 'Published study material not found.');
  if (preview && material.readerError) throw new ApiError(415, material.readerError);
  const filePath = preview
    ? material.readerFilePath || (['PDF', 'TXT', 'IPYNB'].includes(material.fileType) ? material.filePath : null)
    : material.filePath;
  if (!filePath) throw new ApiError(415, 'This published file type cannot be previewed in the reader.');
  const stream = await privateFileStorage.open(env.academicResourceStorageDir, filePath);
  return {
    stream,
    fileName: material.originalFileName,
    mimeType: preview && filePath !== material.filePath ? 'application/pdf' : material.mimeType,
    inlineFileName: preview && filePath !== material.filePath ? `${path.parse(material.originalFileName).name}.pdf` : material.originalFileName,
  };
}

async function deleteMaterial(ownerId, materialId) {
  const material = await prisma.dataScienceMaterial.findFirst({
    where: { id: materialId, ownerId },
    select: { id: true, filePath: true, readerFilePath: true },
  });
  if (!material) throw new ApiError(404, 'Study material not found.');
  await prisma.dataScienceMaterial.delete({ where: { id: materialId } });
  await removeStoredFiles([material.filePath, material.readerFilePath]);
}

async function deleteModule(ownerId, moduleId) {
  const module = await prisma.dataScienceModule.findFirst({
    where: { id: moduleId, ownerId },
    include: { materials: { select: { filePath: true, readerFilePath: true } } },
  });
  if (!module) throw new ApiError(404, 'Data Science module not found.');
  await prisma.dataScienceModule.delete({ where: { id: moduleId } });
  await removeStoredFiles(module.materials.flatMap(({ filePath, readerFilePath }) => [filePath, readerFilePath]));
}

async function removeStoredFiles(filePaths) {
  for (const filePath of new Set(filePaths.filter(Boolean))) {
    try {
      await privateFileStorage.remove(env.academicResourceStorageDir, filePath);
    } catch (error) {
      console.error('Unable to remove deleted Data Science file', error);
      throw error;
    }
  }
}

module.exports = {
  createModule,
  deleteMaterial,
  deleteModule,
  getMaterialFile,
  getPublicMaterialFile,
  listModules,
  listPublicModules,
  MAX_UPLOAD_SIZE,
  updateMaterial,
  updateModule,
  uploadMaterial,
};
