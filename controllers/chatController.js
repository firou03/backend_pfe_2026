const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Créer ou récupérer une conversation
exports.createConversation = async (req, res) => {
  try {
    const { participantId, requestId } = req.body;
    const currentUserId = req.user.id; // ID extrait du token JWT

    // Vérifier si elle existe déjà
    let conv = await Conversation.findOne({
      requestId,
      participants: { $all: [currentUserId, participantId] }
    });

    if (!conv) {
      conv = new Conversation({
        participants: [currentUserId, participantId],
        requestId
      });
      await conv.save();
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
    .populate('participants', 'name email role') // Pour voir le profil de l'autre
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
    }).sort({ createdAt: 1 });
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
    const conv = await Conversation.findOne({ requestId: req.params.requestId })
      .populate('participants', 'name email role');
    res.status(200).json(conv);
  } catch (err) { res.status(500).json(err); }
};
