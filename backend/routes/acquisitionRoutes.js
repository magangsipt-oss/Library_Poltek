const express = require('express');
const controller = require('../controllers/acquisitionController');

const router = express.Router();

router.get('/sources', controller.listSources);
router.post('/sources', controller.saveSource);
router.put('/sources/:id', controller.saveSource);
router.delete('/sources/:id', controller.deleteSource);

router.get('/collections', controller.listCollections);
router.get('/collections/:id', controller.getCollection);
router.post('/collections', controller.createAcquisition);
router.put('/collections/:id', controller.updateAcquisition);
router.post('/collections/import', controller.importAcquisitions);
router.patch('/collections/:id/opac', controller.updateCollectionOpacVisibility);
router.patch('/collections/:id/status', controller.updateLifecycle);
router.delete('/collections/:id', controller.deleteAcquisition);

router.get('/bindings', controller.listBindings);
router.post('/bindings', controller.createBinding);

router.get('/periodicals', controller.listPeriodicals);
router.post('/periodicals', controller.createPeriodical);

router.get('/proposals', controller.listProposals);
router.post('/proposals', controller.createProposal);
router.patch('/proposals/:id/status', controller.updateProposalStatus);

router.get('/shipments', controller.listShipments);
router.post('/shipments', controller.createShipment);

module.exports = router;
