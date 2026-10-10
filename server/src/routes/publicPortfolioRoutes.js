const express = require('express');
const portfolioController = require('../controllers/portfolioController');

const router = express.Router();
router.get('/:slug', portfolioController.getPublicPortfolio);
router.get('/:slug/projects/:projectId/screenshots/:screenshotId', portfolioController.getPublicProjectScreenshot);
router.get('/:slug/certificates/:certificateId/file', portfolioController.getPublicCertificateFile);

module.exports = router;
