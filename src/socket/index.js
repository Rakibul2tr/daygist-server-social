import { Server } from "socket.io";
import { setupChatSocket } from "./chat.socket.js";

let io = null;

export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });
  console.log('socket');
  

  io.on("connection", (socket) => {
    console.log(`🔌 New socket connected: ${socket.id}`);

    setupChatSocket(io, socket);
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
};
