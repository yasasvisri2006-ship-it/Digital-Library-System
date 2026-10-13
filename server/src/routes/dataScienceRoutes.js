const express = require('express');
const controller = require('../controllers/dataScienceController');
const { authenticate } = require('../middleware/authenticate');
const { dataScienceFileUpload } = require('../middleware/dataScienceFileUpload');
const { requireRole } = require('../middleware/requireRole');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const { validateUuidParam } = require('../middleware/validateUuidParam');
const { materialUpdateSchema, materialUploadSchema, moduleUpdateSchema } = require('../validators/dataScienceValidators');

const router = express.Router();
router.use(authenticate, requireRole('STUDENT'));

router.get('/modules', controller.listModules);
router.post('/modules', requireTrustedOrigin, controller.createModule);
router.patch(
  '/modules/:moduleId',
  requireTrustedOrigin,
  validateUuidParam('moduleId'),
  validateRequest(moduleUpdateSchema),
  controller.updateModule,
);
router.delete(
  '/modules/:moduleId',
  requireTrustedOrigin,
  validateUuidParam('moduleId'),
  controller.deleteModule,
);
router.post(
  '/modules/:moduleId/materials',
  requireTrustedOrigin,
  validateUuidParam('moduleId'),
  dataScienceFileUpload.single('file'),
  validateRequest(materialUploadSchema),
  controller.uploadMaterial,
);
router.patch(
  '/materials/:materialId',
  requireTrustedOrigin,
  validateUuidParam('materialId'),
  validateRequest(materialUpdateSchema),
  controller.updateMaterial,
);
router.delete(
  '/materials/:materialId',
  requireTrustedOrigin,
  validateUuidParam('materialId'),
  controller.deleteMaterial,
);
router.get(
  '/modules/:moduleId/materials/:materialId/file',
  validateUuidParam('moduleId'),
  validateUuidParam('materialId'),
  controller.downloadMaterial,
);
router.get(
  '/modules/:moduleId/materials/:materialId/preview',
  validateUuidParam('moduleId'),
  validateUuidParam('materialId'),
  controller.previewMaterial,
);

module.exports = router;
