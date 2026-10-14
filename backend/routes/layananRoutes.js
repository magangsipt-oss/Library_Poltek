const express = require('express');
const { createRequest } = require('../controllers/layananController');

const router = express.Router();

router.post('/', createRequest);

module.exports = router;