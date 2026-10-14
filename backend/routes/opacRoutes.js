const express = require('express');
const { searchBooks } = require('../controllers/opacController');

const router = express.Router();

router.get('/', searchBooks);
router.get('/popular', searchBooks);
router.get('/latest', searchBooks);

module.exports = router;