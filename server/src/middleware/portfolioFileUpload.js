const multer = require('multer');

const portfolioImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const extension = file.originalname.toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      || !/\.(jpe?g|png|webp)$/.test(extension)) {
      callback(new Error('Upload a JPEG, PNG, or WebP project screenshot.'));
      return;
    }
    callback(null, true);
  },
});

const certificateFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
      callback(new Error('Upload a PDF certificate file.'));
      return;
    }
    callback(null, true);
  },
});

const resumeFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
      callback(new Error('Upload a PDF resume file.'));
      return;
    }
    callback(null, true);
  },
});

module.exports = { certificateFileUpload, portfolioImageUpload, resumeFileUpload };
