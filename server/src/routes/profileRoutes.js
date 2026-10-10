const express = require('express');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authenticate');
const { profilePhotoUpload } = require('../middleware/profilePhotoUpload');
const { requireRole } = require('../middleware/requireRole');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const { profileUpdateSchema } = require('../validators/authValidators');

const router = express.Router();

router.use(authenticate, requireRole('STUDENT'));
router.get('/', profileController.getProfile);
router.patch('/', requireTrustedOrigin, validateRequest(profileUpdateSchema), profileController.updateProfile);
router.post(
  '/photo',
  requireTrustedOrigin,
  profilePhotoUpload.single('photo'),
  profileController.uploadPhoto,
);
router.get('/photo', profileController.getPhoto);

module.exports = router;
