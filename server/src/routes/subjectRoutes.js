const express = require('express');
const subjectController = require('../controllers/subjectController');
const { academicFileUpload } = require('../middleware/academicFileUpload');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const { validateUuidParam } = require('../middleware/validateUuidParam');
const {
  createSubjectSchema,
  resourceSchema,
  resourceUpdateSchema,
  subjectSchema,
} = require('../validators/subjectValidators');

const router = express.Router();
router.use(authenticate, requireRole('STUDENT'));

router.get('/', subjectController.listSubjects);
router.post('/demo', requireTrustedOrigin, subjectController.addDemoSubjects);
router.post('/', requireTrustedOrigin, validateRequest(createSubjectSchema), subjectController.createSubject);
router.get('/:subjectId', validateUuidParam('subjectId'), subjectController.getSubject);
router.patch(
  '/:subjectId',
  requireTrustedOrigin,
  validateUuidParam('subjectId'),
  validateRequest(subjectSchema),
  subjectController.updateSubject,
);
router.delete('/:subjectId', requireTrustedOrigin, validateUuidParam('subjectId'), subjectController.deleteSubject);
router.post(
  '/:subjectId/resources',
  requireTrustedOrigin,
  validateUuidParam('subjectId'),
  validateRequest(resourceSchema),
  subjectController.createResource,
);
router.post(
  '/:subjectId/resources/file',
  requireTrustedOrigin,
  validateUuidParam('subjectId'),
  academicFileUpload.single('file'),
  validateRequest(resourceSchema),
  subjectController.uploadResource,
);
router.patch(
  '/resources/:resourceId',
  requireTrustedOrigin,
  validateUuidParam('resourceId'),
  validateRequest(resourceUpdateSchema),
  subjectController.updateResource,
);
router.delete(
  '/resources/:resourceId',
  requireTrustedOrigin,
  validateUuidParam('resourceId'),
  subjectController.deleteResource,
);
router.get(
  '/resources/:resourceId/download',
  validateUuidParam('resourceId'),
  subjectController.downloadResource,
);

module.exports = router;
