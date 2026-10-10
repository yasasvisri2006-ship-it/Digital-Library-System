const portfolioService = require('../services/portfolioService');
const { ApiError } = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function listProjects(req, res) {
  const projects = await portfolioService.listProjects(req.auth.id);
  sendSuccess(res, { message: 'Projects loaded.', data: { projects } });
}

async function createProject(req, res) {
  const project = await portfolioService.createProject(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Project saved.', data: { project } });
}

async function updateProject(req, res) {
  const project = await portfolioService.updateProject(req.auth.id, req.params.projectId, req.body);
  sendSuccess(res, { message: 'Project updated.', data: { project } });
}

async function deleteProject(req, res) {
  await portfolioService.deleteProject(req.auth.id, req.params.projectId);
  sendSuccess(res, { message: 'Project and its screenshots deleted.' });
}

async function uploadProjectScreenshot(req, res) {
  const screenshot = await portfolioService.saveProjectScreenshot(req.auth.id, req.params.projectId, req.file);
  sendSuccess(res, { statusCode: 201, message: 'Project screenshot saved privately.', data: { screenshot } });
}

async function getProjectScreenshot(req, res, next) {
  try {
    const screenshot = await portfolioService.getProjectScreenshot(req.auth.id, req.params.projectId, req.params.screenshotId);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.type(screenshot.mimeType).sendFile(screenshot.path, (error) => { if (error) next(error); });
  } catch (error) {
    next(error);
  }
}

async function deleteProjectScreenshot(req, res) {
  await portfolioService.deleteProjectScreenshot(req.auth.id, req.params.projectId, req.params.screenshotId);
  sendSuccess(res, { message: 'Project screenshot deleted.' });
}

async function getResume(req, res) {
  const portfolio = await portfolioService.getResume(req.auth.id);
  sendSuccess(res, { message: 'Resume loaded.', data: portfolio });
}

async function updateResume(req, res) {
  const resume = await portfolioService.updateResume(req.auth.id, req.body);
  sendSuccess(res, { message: 'Resume updated.', data: { resume } });
}

async function listCertificates(req, res) {
  for (const field of ['search', 'category']) {
    const value = req.query[field];
    if (value !== undefined && (
      typeof value !== 'string'
      || value.length > (field === 'search' ? 120 : 30)
      || (field === 'category' && !['GENERAL', 'AWS_CLOUD'].includes(value))
    )) throw new ApiError(400, `Invalid certificate ${field} filter.`);
  }
  const certificates = await portfolioService.listCertificates(req.auth.id, {
    search: req.query.search?.trim(),
    category: req.query.category,
  });
  sendSuccess(res, { message: 'Certificates loaded.', data: { certificates } });
}

async function createCertificate(req, res) {
  const certificate = await portfolioService.createCertificate(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Certificate saved.', data: { certificate } });
}

async function updateCertificate(req, res) {
  const certificate = await portfolioService.updateCertificate(req.auth.id, req.params.certificateId, req.body);
  sendSuccess(res, { message: 'Certificate updated.', data: { certificate } });
}

async function uploadCertificateFile(req, res) {
  const certificate = await portfolioService.uploadCertificateFile(req.auth.id, req.params.certificateId, req.file);
  sendSuccess(res, { message: 'Certificate file saved privately.', data: { certificate } });
}

async function getCertificateFile(req, res, next) {
  try {
    const file = await portfolioService.getCertificateFile(req.auth.id, req.params.certificateId);
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
    });
    res.download(file.path, file.fileName, (error) => { if (error) next(error); });
  } catch (error) {
    next(error);
  }
}

async function deleteCertificate(req, res) {
  await portfolioService.deleteCertificate(req.auth.id, req.params.certificateId);
  sendSuccess(res, { message: 'Certificate deleted.' });
}

async function listCareer(req, res) {
  const career = await portfolioService.listCareer(req.auth.id);
  sendSuccess(res, { message: 'Career preparation records loaded.', data: { career } });
}

async function createCareerApplication(req, res) {
  const application = await portfolioService.createCareerApplication(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Internship application saved.', data: { application } });
}

async function updateCareerApplication(req, res) {
  const application = await portfolioService.updateCareerApplication(req.auth.id, req.params.applicationId, req.body);
  sendSuccess(res, { message: 'Internship application updated.', data: { application } });
}

async function deleteCareerApplication(req, res) {
  await portfolioService.deleteCareerApplication(req.auth.id, req.params.applicationId);
  sendSuccess(res, { message: 'Internship application deleted.' });
}

async function createCareerResource(req, res) {
  const resource = await portfolioService.createCareerResource(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Career resource saved.', data: { resource } });
}

async function updateCareerResource(req, res) {
  const resource = await portfolioService.updateCareerResource(req.auth.id, req.params.resourceId, req.body);
  sendSuccess(res, { message: 'Career resource updated.', data: { resource } });
}

async function deleteCareerResource(req, res) {
  await portfolioService.deleteCareerResource(req.auth.id, req.params.resourceId);
  sendSuccess(res, { message: 'Career resource deleted.' });
}

async function getPublicPortfolio(req, res) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.slug)) throw new ApiError(404, 'Public portfolio not found.');
  const portfolio = await portfolioService.publicPortfolio(req.params.slug);
  res.set({ 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' });
  sendSuccess(res, { message: 'Public portfolio loaded.', data: { portfolio } });
}

async function getPublicProjectScreenshot(req, res, next) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.slug)) {
    next(new ApiError(404, 'Public portfolio screenshot not found.'));
    return;
  }
  try {
    const screenshot = await portfolioService.getPublicProjectScreenshot(req.params.slug, req.params.projectId, req.params.screenshotId);
    res.set({ 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
    res.type(screenshot.mimeType).sendFile(screenshot.path, (error) => { if (error) next(error); });
  } catch (error) {
    next(error);
  }
}

async function getPublicCertificateFile(req, res, next) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.slug)) {
    next(new ApiError(404, 'Public certificate file not found.'));
    return;
  }
  try {
    const file = await portfolioService.getPublicCertificateFile(req.params.slug, req.params.certificateId);
    res.set({
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
    });
    res.download(file.path, file.fileName, (error) => { if (error) next(error); });
  } catch (error) {
    next(error);
  }
}

function validatePortfolioParams(...names) {
  return (req, res, next) => {
    for (const name of names) {
      if (!uuidPattern.test(req.params[name])) {
        next(new ApiError(400, `Invalid ${name}.`));
        return;
      }
    }
    next();
  };
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
  getPublicPortfolio,
  getPublicProjectScreenshot,
  getResume,
  listCareer,
  listCertificates,
  listProjects,
  updateCareerApplication,
  updateCareerResource,
  updateCertificate,
  updateProject,
  updateResume,
  uploadCertificateFile,
  uploadProjectScreenshot,
  validatePortfolioParams,
};
