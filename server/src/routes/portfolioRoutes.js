const express = require('express');
const portfolioController = require('../controllers/portfolioController');
const { authenticate } = require('../middleware/authenticate');
const { certificateFileUpload, portfolioImageUpload } = require('../middleware/portfolioFileUpload');
const { requireRole } = require('../middleware/requireRole');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const {
  careerApplicationSchema,
  careerApplicationUpdateSchema,
  careerResourceSchema,
  careerResourceUpdateSchema,
  certificateSchema,
  certificateUpdateSchema,
  projectSchema,
  projectUpdateSchema,
  resumeSchema,
} = require('../validators/portfolioValidators');

const router = express.Router();
router.use(authenticate, requireRole('STUDENT'));

router.get('/projects', portfolioController.listProjects);
router.post('/projects', requireTrustedOrigin, validateRequest(projectSchema), portfolioController.createProject);
router.patch(
  '/projects/:projectId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('projectId'),
  validateRequest(projectUpdateSchema),
  portfolioController.updateProject,
);
router.delete(
  '/projects/:projectId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('projectId'),
  portfolioController.deleteProject,
);
router.post(
  '/projects/:projectId/screenshots',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('projectId'),
  portfolioImageUpload.single('file'),
  portfolioController.uploadProjectScreenshot,
);
router.get(
  '/projects/:projectId/screenshots/:screenshotId',
  portfolioController.validatePortfolioParams('projectId', 'screenshotId'),
  portfolioController.getProjectScreenshot,
);
router.delete(
  '/projects/:projectId/screenshots/:screenshotId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('projectId', 'screenshotId'),
  portfolioController.deleteProjectScreenshot,
);

router.get('/resume', portfolioController.getResume);
router.put(
  '/resume',
  requireTrustedOrigin,
  validateRequest(resumeSchema.refine((value) => Object.keys(value).length > 0, 'Provide resume details to update.')),
  portfolioController.updateResume,
);

router.get('/certificates', portfolioController.listCertificates);
router.post('/certificates', requireTrustedOrigin, validateRequest(certificateSchema), portfolioController.createCertificate);
router.patch(
  '/certificates/:certificateId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('certificateId'),
  validateRequest(certificateUpdateSchema),
  portfolioController.updateCertificate,
);
router.post(
  '/certificates/:certificateId/file',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('certificateId'),
  certificateFileUpload.single('file'),
  portfolioController.uploadCertificateFile,
);
router.get(
  '/certificates/:certificateId/file',
  portfolioController.validatePortfolioParams('certificateId'),
  portfolioController.getCertificateFile,
);
router.delete(
  '/certificates/:certificateId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('certificateId'),
  portfolioController.deleteCertificate,
);

router.get('/career', portfolioController.listCareer);
router.post('/career/applications', requireTrustedOrigin, validateRequest(careerApplicationSchema), portfolioController.createCareerApplication);
router.patch(
  '/career/applications/:applicationId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('applicationId'),
  validateRequest(careerApplicationUpdateSchema),
  portfolioController.updateCareerApplication,
);
router.delete(
  '/career/applications/:applicationId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('applicationId'),
  portfolioController.deleteCareerApplication,
);
router.post('/career/resources', requireTrustedOrigin, validateRequest(careerResourceSchema), portfolioController.createCareerResource);
router.patch(
  '/career/resources/:resourceId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('resourceId'),
  validateRequest(careerResourceUpdateSchema),
  portfolioController.updateCareerResource,
);
router.delete(
  '/career/resources/:resourceId',
  requireTrustedOrigin,
  portfolioController.validatePortfolioParams('resourceId'),
  portfolioController.deleteCareerResource,
);

module.exports = router;
