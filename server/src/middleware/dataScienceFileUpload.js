const path = require('node:path');
const multer = require('multer');
const { ApiError } = require('../utils/ApiError');
const { MAX_UPLOAD_SIZE } = require('../services/dataScienceService');

const allowedExtensions = new Set(['ppt', 'pptx', 'pdf', 'doc', 'docx', 'txt', 'ipynb']);

const dataScienceFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).slice(1).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      callback(new ApiError(400, 'Choose a PPT, PPTX, PDF, DOC, DOCX, TXT, or IPYNB file.'));
      return;
    }
    callback(null, true);
  },
});

module.exports = { dataScienceFileUpload };
