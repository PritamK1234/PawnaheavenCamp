const express = require('express');
const router = express.Router();
const eticketController = require('../controllers/eticketController');

router.post('/', eticketController.createETicket);
router.get('/:ticketId', eticketController.getETicketById);

module.exports = router;
