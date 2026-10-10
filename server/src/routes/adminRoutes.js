const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const { authenticate } = require('../middleware/authenticate');
const { profilePhotoUpload } = require('../middleware/profilePhotoUpload');
const { requireRole } = require('../middleware/requireRole');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const {
  createStudentSchema,
  passwordResetSchema,
  statusSchema,
  updateStudentSchema,
} = require('../validators/adminUserValidators');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

router.post(
  '/users',
  requireTrustedOrigin,
  profilePhotoUpload.single('photo'),
  validateRequest(createStudentSchema),
  adminUserController.createStudent,
);
router.get('/users/', adminUserController.listStudents);
router.get('/users/:userId', adminUserController.validateUserId, adminUserController.getStudent);
router.patch(
  '/users/:userId',
  requireTrustedOrigin,
  adminUserController.validateUserId,
  validateRequest(updateStudentSchema),
  adminUserController.updateStudent,
);
router.patch(
  '/users/:userId/status',
  requireTrustedOrigin,
  adminUserController.validateUserId,
  validateRequest(statusSchema),
  adminUserController.setStudentStatus,
);
router.patch(
  '/users/:userId/password',
  requireTrustedOrigin,
  adminUserController.validateUserId,
  validateRequest(passwordResetSchema),
  adminUserController.resetStudentPassword,
);
router.patch(
  '/users/:userId/photo',
  requireTrustedOrigin,
  adminUserController.validateUserId,
  profilePhotoUpload.single('photo'),
  adminUserController.updateStudentPhoto,
);
router.get('/users/:userId/photo', adminUserController.validateUserId, adminUserController.getStudentPhoto);

module.exports = router;
