const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/initiate', bookingController.initiateBooking);
router.get('/ledger', bookingController.getLedgerEntries);
router.get('/ledger/monthly', bookingController.getMonthlyLedger);
router.post('/ledger', bookingController.addLedgerEntry);
router.put('/ledger/:id', bookingController.updateLedgerEntry);
router.delete('/ledger/:id', bookingController.deleteLedgerEntry);
router.get('/:bookingId', bookingController.getBooking);
router.put('/update-status', bookingController.updateBookingStatus);
router.post('/process-confirmed', bookingController.processConfirmedBooking);
router.post('/process-cancelled', bookingController.processCancelledBooking);

module.exports = router;
