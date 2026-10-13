const dataScienceService = require('../services/dataScienceService');
const { sendSuccess } = require('../utils/apiResponse');

async function listModules(req, res) {
  const modules = await dataScienceService.listModules(req.auth.id);
  sendSuccess(res, { message: 'Data Science modules loaded.', data: { modules } });
}

async function createModule(req, res) {
  const module = await dataScienceService.createModule(req.auth.id);
  sendSuccess(res, { statusCode: 201, message: 'Data Science module created.', data: { module } });
}

async function updateModule(req, res) {
  const module = await dataScienceService.updateModule(req.auth.id, req.params.moduleId, req.body.title);
  sendSuccess(res, { message: 'Data Science module renamed.', data: { module } });
}

async function deleteModule(req, res) {
  await dataScienceService.deleteModule(req.auth.id, req.params.moduleId);
  sendSuccess(res, { message: 'Data Science module and its materials deleted.' });
}

async function uploadMaterial(req, res) {
  const material = await dataScienceService.uploadMaterial(
    req.auth.id,
    req.params.moduleId,
    req.body.title,
    req.file,
  );
  sendSuccess(res, {
    statusCode: 201,
    message: material.previewError
      ? `Study material uploaded. Preview could not be prepared: ${material.previewError}`
      : 'Study material uploaded.',
    data: { material },
  });
}

async function updateMaterial(req, res) {
  const material = await dataScienceService.updateMaterial(req.auth.id, req.params.materialId, req.body.title);
  sendSuccess(res, { message: 'Study material renamed.', data: { material } });
}

async function deleteMaterial(req, res) {
  await dataScienceService.deleteMaterial(req.auth.id, req.params.materialId);
  sendSuccess(res, { message: 'Study material deleted.' });
}

async function streamMaterial(req, res, next, preview) {
  try {
    const file = await dataScienceService.getMaterialFile(
      req.auth.id,
      req.params.moduleId,
      req.params.materialId,
      preview,
    );
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.inlineFileName)}`,
      'Content-Type': file.mimeType,
      'X-Content-Type-Options': 'nosniff',
    });
    file.stream.on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}

function downloadMaterial(req, res, next) {
  return streamMaterial(req, res, next, false);
}

function previewMaterial(req, res, next) {
  return streamMaterial(req, res, next, true);
}

module.exports = {
  createModule,
  deleteMaterial,
  deleteModule,
  downloadMaterial,
  listModules,
  previewMaterial,
  updateMaterial,
  updateModule,
  uploadMaterial,
};
