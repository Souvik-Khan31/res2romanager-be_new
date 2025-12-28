const express = require('express');
const router = express.Router();
const phonepeController = require('../controllers/phonepeController');

router.post('/initiate', phonepeController.initiate);
router.get('/status/:merchantTransactionId', phonepeController.checkStatus);
router.post('/webhook', phonepeController.handleWebhook);

module.exports = router;
