const { createReadStream } = require('node:fs');
const path = require('node:path');
const adminUserService = require('../services/adminUserService');
const { ApiError } = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUserId(req, res, next) {
  if (!uuidPattern.test(req.params.userId)) {
    next(new ApiError(400, 'Invalid user ID.'));
    return;
  }
  next();
}

async function createStudent(req, res) {
  const user = await adminUserService.createStudent(req.body, req.file);
  sendSuccess(res, { statusCode: 201, message: 'Student account created.', data: { user } });
}

async function listStudents(req, res) {
  const result = await adminUserService.listStudents(req.query);
  sendSuccess(res, { message: 'Student accounts loaded.', data: result });
}

async function getStudent(req, res) {
  const user = await adminUserService.getStudent(req.params.userId);
  sendSuccess(res, { message: 'Student account loaded.', data: { user } });
}

async function updateStudent(req, res) {
  const user = await adminUserService.updateStudent(req.params.userId, req.body);
  sendSuccess(res, { message: 'Student account updated.', data: { user } });
}

async function setStudentStatus(req, res) {
  const user = await adminUserService.setStudentActive(req.params.userId, req.body.isActive, req.auth.id);
  sendSuccess(res, { message: `Student account ${user.isActive ? 'activated' : 'deactivated'}.`, data: { user } });
}

async function resetStudentPassword(req, res) {
  const user = await adminUserService.resetStudentPassword(req.params.userId, req.body.password);
  sendSuccess(res, { message: 'Student password reset; existing sessions have been revoked.', data: { user } });
}

async function updateStudentPhoto(req, res) {
  const profile = await adminUserService.updateStudentPhoto(req.params.userId, req.file);
  sendSuccess(res, { message: 'Student profile photo updated.', data: { profile } });
}

async function getStudentPhoto(req, res, next) {
  try {
    const photoPath = await adminUserService.getStudentPhotoPath(req.params.userId);
    res.set({
      'Cache-Control': 'private, no-store',
      'Cross-Origin-Resource-Policy': 'same-site',
      'Content-Type': path.extname(photoPath) === '.png'
        ? 'image/png'
        : path.extname(photoPath) === '.webp'
          ? 'image/webp'
          : 'image/jpeg',
    });
    createReadStream(photoPath).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createStudent,
  getStudent,
  getStudentPhoto,
  listStudents,
  resetStudentPassword,
  setStudentStatus,
  updateStudent,
  updateStudentPhoto,
  validateUserId,
};
