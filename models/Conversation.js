const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  requestId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TransportRequest' }],
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    createdAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
