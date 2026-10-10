const multer = require('multer');

const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.mimetype)) {
      callback(new Error('Upload a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
});

module.exports = { profilePhotoUpload };
