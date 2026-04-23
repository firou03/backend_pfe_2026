const router = require('express').Router();
const chatCtrl = require('../controllers/chatController');
const auth = require('../middlewares/authMiddleware');
router.post('/create', auth, chatCtrl.createConversation);
router.get('/conversations', auth, chatCtrl.getConversations);
router.get('/messages/:conversationId', auth, chatCtrl.getMessages);
router.post('/send/:conversationId', auth, chatCtrl.sendMessage);
router.put('/read/:conversationId', auth, chatCtrl.markMessagesAsRead);
router.get('/by-request/:requestId', auth, chatCtrl.getConversationByRequest);

module.exports = router;
