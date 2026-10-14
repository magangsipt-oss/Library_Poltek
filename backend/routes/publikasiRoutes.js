const express = require('express');
const { listPublications } = require('../controllers/publikasiController');

const router = express.Router();

router.get('/', listPublications);

module.exports = router;