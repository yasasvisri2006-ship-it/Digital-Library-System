const subjectService = require('../services/subjectService');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError } = require('../utils/ApiError');

async function listSubjects(req, res) {
  for (const field of ['search', 'semester']) {
    const value = req.query[field];
    if (value !== undefined && (typeof value !== 'string' || value.length > (field === 'search' ? 120 : 40))) {
      throw new ApiError(400, `Invalid ${field} filter.`);
    }
  }
  const subjects = await subjectService.listSubjects(req.auth.id, {
    search: req.query.search?.trim(),
    semester: req.query.semester?.trim(),
  });
  sendSuccess(res, { message: 'Subjects loaded.', data: { subjects } });
}

async function createSubject(req, res) {
  const subject = await subjectService.createSubject(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Subject created.', data: { subject } });
}

async function addDemoSubjects(req, res) {
  const subjects = await subjectService.addDemoSubjects(req.auth.id);
  sendSuccess(res, { message: 'Optional demo subjects added.', data: { subjects } });
}

async function getSubject(req, res) {
  const subject = await subjectService.getSubject(req.auth.id, req.params.subjectId);
  sendSuccess(res, { message: 'Subject loaded.', data: { subject } });
}

async function updateSubject(req, res) {
  const subject = await subjectService.updateSubject(req.auth.id, req.params.subjectId, req.body);
  sendSuccess(res, { message: 'Subject updated.', data: { subject } });
}

async function deleteSubject(req, res) {
  await subjectService.deleteSubject(req.auth.id, req.params.subjectId);
  sendSuccess(res, { message: 'Subject and its resources deleted.' });
}

async function createResource(req, res) {
  const resource = await subjectService.createResource(req.auth.id, req.params.subjectId, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Study resource created.', data: { resource } });
}

async function uploadResource(req, res) {
  const resource = await subjectService.saveResourceFile(req.auth.id, req.params.subjectId, req.body, req.file);
  sendSuccess(res, { statusCode: 201, message: 'PDF uploaded.', data: { resource } });
}

async function updateResource(req, res) {
  const resource = await subjectService.updateResource(req.auth.id, req.params.resourceId, req.body);
  sendSuccess(res, { message: 'Study resource updated.', data: { resource } });
}

async function deleteResource(req, res) {
  await subjectService.deleteResource(req.auth.id, req.params.resourceId);
  sendSuccess(res, { message: 'Study resource deleted.' });
}

async function downloadResource(req, res, next) {
  try {
    const file = await subjectService.getDownload(req.auth.id, req.params.resourceId);
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
    });
    res.attachment(file.fileName);
    file.stream.on('error', next);
    file.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addDemoSubjects,
  createResource,
  createSubject,
  deleteResource,
  deleteSubject,
  downloadResource,
  getSubject,
  listSubjects,
  updateResource,
  updateSubject,
  uploadResource,
};
