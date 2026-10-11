const express = require('express');
const controller = require('../controllers/educationalMaterialController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.get('/', controller.listMaterials);
router.get('/:slug/file', authenticate, requireRole('STUDENT'), controller.downloadMaterial);

module.exports = router;
