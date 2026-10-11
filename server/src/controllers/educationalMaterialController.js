const educationalMaterialService = require('../services/educationalMaterialService');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError } = require('../utils/ApiError');

const sections = new Set([
  'subjects',
  'modules',
  'my-learning',
  'lab-experiments',
  'tools',
  'cloud-aws',
  'study-materials',
  'references',
  'datasets',
  'assignments',
  'coding-practice',
  'quizzes-tests',
]);

async function listMaterials(req, res) {
  const { section } = req.query;
  if (section !== undefined && (typeof section !== 'string' || !sections.has(section))) {
    throw new ApiError(400, 'Invalid educational resource section.');
  }
  const materials = await educationalMaterialService.listMaterials(section);
  sendSuccess(res, { message: 'Educational resources loaded.', data: { materials } });
}

async function downloadMaterial(req, res, next) {
  try {
    if (!/^[a-z0-9-]{2,120}$/.test(req.params.slug)) {
      throw new ApiError(404, 'Educational file not found.');
    }
    const file = await educationalMaterialService.getDownload(req.params.slug);
    res.set({
      'Cache-Control': 'private, no-store',
      'Content-Type': file.mimeType,
      'X-Content-Type-Options': 'nosniff',
    });
    res.attachment(file.fileName);
    file.stream.on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = { downloadMaterial, listMaterials };
