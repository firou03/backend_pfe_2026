const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Créer ou récupérer une conversation
exports.createConversation = async (req, res) => {
  try {
    const { participantId, requestId } = req.body;
    const currentUserId = req.user.id; // ID extrait du token JWT

    // Check if conversation already exists between these two users
    let conv = await Conversation.findOne({
      participants: { $all: [currentUserId, participantId] }
    });

    if (!conv) {
      // Create new conversation if none exists
      conv = new Conversation({
        participants: [currentUserId, participantId],
        requestId: [requestId]
      });
      await conv.save();
    } else {
      // Add request ID to existing conversation if not already there
      if (conv.requestId && !conv.requestId.includes(requestId)) {
        conv.requestId = Array.isArray(conv.requestId) ? [...conv.requestId, requestId] : [conv.requestId, requestId];
        await conv.save();
      }
    }
    res.status(200).json(conv);
  } catch (err) { res.status(500).json(err); }
};

// Récupérer toutes les conversations de l'utilisateur
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: { $in: [req.user.id] }
    })
    .populate('participants', 'name email role user_image') // Pour voir le profil de l'autre
    .sort({ updatedAt: -1 });
    res.status(200).json(conversations);
  } catch (err) { res.status(500).json(err); }
};

// Envoyer un message
exports.sendMessage = async (req, res) => {
  try {
    const newMessage = new Message({
      conversationId: req.params.conversationId,
      senderId: req.user.id,
      content: req.body.content
    });
    const savedMessage = await newMessage.save();

    // Mettre à jour le "dernier message" dans la conversation
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      lastMessage: {
        content: req.body.content,
        senderId: req.user.id,
        createdAt: new Date()
      }
    });

    res.status(200).json(savedMessage);
  } catch (err) { res.status(500).json(err); }
};

// Récupérer les messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
    .populate('senderId', 'name email user_image')
    .sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) { res.status(500).json(err); }
};

// Marquer les messages comme lus
exports.markMessagesAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      { conversationId: req.params.conversationId, senderId: { $ne: req.user.id }, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: "Messages marqués comme lus" });
  } catch (err) { res.status(500).json(err); }
};

// Récupérer une conversation par ID de requête
exports.getConversationByRequest = async (req, res) => {
  try {
    const conv = await Conversation.findOne({ requestId: { $in: [req.params.requestId] } })
      .populate('participants', 'name email role user_image');
    res.status(200).json(conv);
  } catch (err) { res.status(500).json(err); }
};
