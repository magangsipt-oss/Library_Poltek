const express = require('express');
const controller = require('../controllers/catalogController');

const router = express.Router();

router.get('/records', controller.listRecords);
router.post('/records', controller.createRecord);
router.get('/records/export', controller.exportRecords);
router.post('/records/:id/copy', controller.copyRecord);
router.post('/records/from-book/:bookId', controller.catalogizeBook);
router.patch('/records/:id/status', controller.updateStatus);
router.delete('/records/:id', controller.deleteRecord);

router.get('/digital-content', controller.listDigitalContent);
router.get('/digital-content/:id/file', controller.downloadDigitalContent);
router.delete('/digital-content/:id', controller.deleteDigitalContent);
router.post('/records/:id/digital-content', express.raw({
  type: 'application/octet-stream',
  limit: '20mb'
}), controller.uploadDigitalContent);

router.get('/articles', controller.listArticles);
router.post('/articles', controller.saveArticle);
router.put('/articles/:id', controller.saveArticle);
router.delete('/articles/:id', controller.deleteArticle);

module.exports = router;
