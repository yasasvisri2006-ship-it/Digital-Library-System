const express = require('express');
const controller = require('../controllers/educationalMaterialController');

const router = express.Router();

router.get('/', controller.listMaterials);
router.get('/:slug/file', controller.downloadMaterial);

module.exports = router;
