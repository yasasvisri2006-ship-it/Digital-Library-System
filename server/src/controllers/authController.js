const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError } = require('../utils/ApiError');
const { clearSessionCookie, setSessionCookie } = require('../utils/sessionCookie');
const firstAdminService = require('../services/firstAdminService');

async function loginAsStudent(req, res) {
  const result = await authService.login(req.body, 'STUDENT');
  setSessionCookie(res, result.token);
  sendSuccess(res, {
    message: 'Student login successful.',
    data: { user: result.user },
  });
}

async function loginAsAdmin(req, res) {
  const result = await authService.login(req.body, 'ADMIN');
  setSessionCookie(res, result.token);
  sendSuccess(res, {
    message: 'Administrator login successful.',
    data: { user: result.user },
  });
}

async function getAdminSetupStatus(req, res) {
  const available = await firstAdminService.isAdminSetupAvailable();
  sendSuccess(res, {
    message: 'Administrator setup status loaded.',
    data: { available },
  });
}

async function setupFirstAdmin(req, res) {
  const user = await firstAdminService.setupFirstAdmin(req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Initial administrator account created.',
    data: { user },
  });
}

async function getCurrentUser(req, res) {
  const user = await authService.getPublicUser(req.auth.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  sendSuccess(res, {
    message: 'User loaded successfully.',
    data: { user },
  });
}

async function logout(req, res) {
  await authService.revokeToken(req.cookies?.mbu_session);
  clearSessionCookie(res);
  sendSuccess(res, { message: 'You have been signed out.' });
}

module.exports = {
  getAdminSetupStatus,
  getCurrentUser,
  loginAsAdmin,
  loginAsStudent,
  logout,
  setupFirstAdmin,
};
