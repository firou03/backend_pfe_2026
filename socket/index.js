const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("../models/user.model");
const { clearExpiredBanIfNeeded, isUserBanned } = require("../utils/userBan");

let io = null;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowList = [
      "http://localhost:3000",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:19006",
    ];
    if (allowList.includes(origin)) {
      callback(null, true);
      return;
    }
    if (/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.0\.2\.2)(:\d+)?$/i.test(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  methods: ["GET", "POST"],
  credentials: true,
};

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Not authorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error("User not found"));
    }

    await clearExpiredBanIfNeeded(user);
    if (isUserBanned(user) && user.role !== "admin") {
      return next(new Error("Account banned"));
    }

    socket.userId = user._id.toString();
    next();
  } catch {
    next(new Error("Not authorized"));
  }
}

function initSocket(server) {
  io = new Server(server, { cors: corsOptions });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on("join_conversation", (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on("leave_conversation", (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
