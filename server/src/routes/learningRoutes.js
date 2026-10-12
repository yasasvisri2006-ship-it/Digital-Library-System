const express = require('express');
const learningController = require('../controllers/learningController');
const { codeExecutionRateLimiter } = require('../middleware/codeExecutionRateLimiter');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const { validateUuidParam } = require('../middleware/validateUuidParam');
const {
  cloudCertificateSchema,
  cloudLabSchema,
  cloudLabUpdateSchema,
  codeExecutionSchema,
  codingProblemSchema,
  codingProblemUpdateSchema,
  progressSchema,
} = require('../validators/learningValidators');

const router = express.Router();
router.use(authenticate, requireRole('STUDENT'));

router.get('/coding/problems', learningController.listCodingProblems);
router.get('/coding/history', learningController.listCodingHistory);
router.post(
  '/coding/execute',
  requireTrustedOrigin,
  codeExecutionRateLimiter,
  validateRequest(codeExecutionSchema),
  learningController.executeCodingCode,
);
router.post('/coding/problems', requireTrustedOrigin, validateRequest(codingProblemSchema), learningController.createCodingProblem);
router.patch(
  '/coding/problems/:problemId',
  requireTrustedOrigin,
  validateUuidParam('problemId'),
  validateRequest(codingProblemUpdateSchema),
  learningController.updateCodingProblem,
);
router.delete(
  '/coding/problems/:problemId',
  requireTrustedOrigin,
  validateUuidParam('problemId'),
  learningController.deleteCodingProblem,
);

router.get('/tools', learningController.listToolProgress);
router.get('/tools/:toolKey', learningController.getToolProgress);
router.put(
  '/tools/:toolKey',
  requireTrustedOrigin,
  validateRequest(progressSchema),
  learningController.saveToolProgress,
);

router.get('/cloud', learningController.getCloudLearning);
router.patch('/cloud', requireTrustedOrigin, validateRequest(progressSchema), learningController.saveCloudProgress);
router.post('/cloud/labs', requireTrustedOrigin, validateRequest(cloudLabSchema), learningController.createCloudLabNote);
router.patch(
  '/cloud/labs/:noteId',
  requireTrustedOrigin,
  validateUuidParam('noteId'),
  validateRequest(cloudLabUpdateSchema),
  learningController.updateCloudLabNote,
);
router.delete(
  '/cloud/labs/:noteId',
  requireTrustedOrigin,
  validateUuidParam('noteId'),
  learningController.deleteCloudLabNote,
);
router.post(
  '/cloud/certificates',
  requireTrustedOrigin,
  validateRequest(cloudCertificateSchema),
  learningController.createCloudCertificate,
);
router.delete(
  '/cloud/certificates/:certificateId',
  requireTrustedOrigin,
  validateUuidParam('certificateId'),
  learningController.deleteCloudCertificate,
);

module.exports = router;
