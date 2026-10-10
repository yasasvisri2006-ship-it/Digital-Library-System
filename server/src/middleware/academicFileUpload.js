const multer = require('multer');

const academicFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
      callback(new Error('Upload a PDF file for academic resources.'));
      return;
    }
    callback(null, true);
  },
});

module.exports = { academicFileUpload };
