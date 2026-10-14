const express = require('express');
const { getOverview, getSession, login, logout } = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/login', login);
router.post('/logout', logout);
router.get('/session', requireAdmin, getSession);
router.get('/overview', requireAdmin, getOverview);

module.exports = router;
