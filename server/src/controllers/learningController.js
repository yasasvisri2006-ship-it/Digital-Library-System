const learningService = require('../services/learningService');
const codeExecutionService = require('../services/codeExecutionService');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError } = require('../utils/ApiError');

const codingLanguages = new Set(['PYTHON', 'SQL', 'JAVA', 'CPP', 'DSA']);
const codingDifficulties = new Set(['EASY', 'MEDIUM', 'HARD']);
const codingStatuses = new Set(['all', 'completed', 'incomplete', 'bookmarked']);

async function listCodingProblems(req, res) {
  const { search, language, difficulty, status = 'all' } = req.query;
  if (search !== undefined && (typeof search !== 'string' || search.length > 120)) {
    throw new ApiError(400, 'Invalid search filter.');
  }
  if (language !== undefined && !codingLanguages.has(language)) throw new ApiError(400, 'Invalid language filter.');
  if (difficulty !== undefined && !codingDifficulties.has(difficulty)) throw new ApiError(400, 'Invalid difficulty filter.');
  if (!codingStatuses.has(status)) throw new ApiError(400, 'Invalid completion filter.');
  const result = await learningService.listCodingProblems(req.auth.id, {
    search: search?.trim(),
    language,
    difficulty,
    status,
  });
  sendSuccess(res, { message: 'Coding practice loaded.', data: result });
}

async function createCodingProblem(req, res) {
  const problem = await learningService.createCodingProblem(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Coding problem saved.', data: { problem } });
}

async function updateCodingProblem(req, res) {
  const problem = await learningService.updateCodingProblem(req.auth.id, req.params.problemId, req.body);
  sendSuccess(res, { message: 'Coding problem updated.', data: { problem } });
}

async function deleteCodingProblem(req, res) {
  await learningService.deleteCodingProblem(req.auth.id, req.params.problemId);
  sendSuccess(res, { message: 'Coding problem deleted.' });
}

async function listCodingHistory(req, res) {
  const history = await learningService.listCodingHistory(req.auth.id);
  sendSuccess(res, { message: 'Coding practice history loaded.', data: { history } });
}

async function executeCodingCode(req, res) {
  const execution = await codeExecutionService.executePython(req.body.code);
  sendSuccess(res, { message: 'Code execution completed.', data: { execution } });
}

async function getToolProgress(req, res) {
  const progress = await learningService.getToolProgress(req.auth.id, req.params.toolKey);
  sendSuccess(res, { message: 'Tool progress loaded.', data: { progress } });
}

async function listToolProgress(req, res) {
  const progress = await learningService.listToolProgress(req.auth.id);
  sendSuccess(res, { message: 'Tool progress loaded.', data: { progress } });
}

async function saveToolProgress(req, res) {
  const progress = await learningService.saveToolProgress(req.auth.id, req.params.toolKey, req.body);
  sendSuccess(res, { message: 'Tool progress saved.', data: { progress } });
}

async function getCloudLearning(req, res) {
  const learning = await learningService.getCloudLearning(req.auth.id);
  sendSuccess(res, { message: 'Cloud learning loaded.', data: { learning } });
}

async function saveCloudProgress(req, res) {
  const progress = await learningService.saveCloudProgress(req.auth.id, req.body);
  sendSuccess(res, { message: 'Cloud learning progress saved.', data: { progress } });
}

async function createCloudLabNote(req, res) {
  const note = await learningService.createCloudLabNote(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Cloud lab note saved.', data: { note } });
}

async function updateCloudLabNote(req, res) {
  const note = await learningService.updateCloudLabNote(req.auth.id, req.params.noteId, req.body);
  sendSuccess(res, { message: 'Cloud lab note updated.', data: { note } });
}

async function deleteCloudLabNote(req, res) {
  await learningService.deleteCloudLabNote(req.auth.id, req.params.noteId);
  sendSuccess(res, { message: 'Cloud lab note deleted.' });
}

async function createCloudCertificate(req, res) {
  const certificate = await learningService.createCloudCertificate(req.auth.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'AWS certificate record saved.', data: { certificate } });
}

async function deleteCloudCertificate(req, res) {
  await learningService.deleteCloudCertificate(req.auth.id, req.params.certificateId);
  sendSuccess(res, { message: 'AWS certificate record deleted.' });
}

module.exports = {
  createCloudCertificate,
  createCloudLabNote,
  createCodingProblem,
  deleteCloudCertificate,
  deleteCloudLabNote,
  deleteCodingProblem,
  executeCodingCode,
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
