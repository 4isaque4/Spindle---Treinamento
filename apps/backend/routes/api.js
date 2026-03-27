const express = require('express');
const router = express.Router();
const path = require('path');

const authController = require(path.join(__dirname, '..', 'controllers', 'authController'));
const chatController = require(path.join(__dirname, '..', 'controllers', 'chatController'));
const feedbackController = require(path.join(__dirname, '..', 'controllers', 'feedbackController'));
const correctionsController = require(path.join(__dirname, '..', 'controllers', 'correctionsController'));
const authMiddleware = require(path.join(__dirname, '..', 'middleware', 'authMiddleware'));

router.post('/login', authController.login);
router.get('/verify-token', authMiddleware, authController.verifyToken);

router.post('/chat', chatController.proxyToDify);
router.delete('/conversations/:conversationId/messages', chatController.deleteConversationMessages);

router.post('/feedback', feedbackController.createFeedback);
router.get('/feedbacks', feedbackController.getFeedbacks);
router.put('/feedbacks/:id/status', feedbackController.updateFeedbackStatus);
router.delete('/feedbacks/:id', feedbackController.deleteFeedback);
router.get('/feedback/stats', feedbackController.getFeedbackStats);

router.get('/corrections', correctionsController.listCorrections);
router.post('/corrections', correctionsController.createCorrection);
router.post('/corrections/:id/publish', authMiddleware, correctionsController.publishCorrection);
router.put('/corrections/:id', correctionsController.updateCorrection);
router.put('/corrections/:id/status', correctionsController.updateCorrectionStatus);
router.delete('/corrections/:id', correctionsController.deleteCorrection);

module.exports = router;
