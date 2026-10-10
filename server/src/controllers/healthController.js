const healthService = require('../services/healthService');
const { sendSuccess } = require('../utils/apiResponse');

function getHealth(req, res) {
  sendSuccess(res, {
    message: 'Digital Library API is healthy.',
    data: healthService.getHealth(),
  });
}

module.exports = { getHealth };
