const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const subjectRoutes = require('./subjectRoutes');
const learningRoutes = require('./learningRoutes');
const portfolioRoutes = require('./portfolioRoutes');
const publicPortfolioRoutes = require('./publicPortfolioRoutes');
const libraryRoutes = require('./libraryRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.get('/health', healthController.getHealth);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/subjects', subjectRoutes);
router.use('/learning', learningRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/public/portfolio', publicPortfolioRoutes);
router.use('/library', libraryRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
