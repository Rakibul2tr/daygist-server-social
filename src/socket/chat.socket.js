import User from "../models/user/user.model.js";

// ✅ multi-device safe
const onlineUsers = new Map(); // userId -> Set(socketId)
const socketUsers = new Map(); // socketId -> userId
const disconnectTimers = new Map(); // userId -> timeout

export const getReceiverSocketId = (userId) => {
  const set = onlineUsers.get(String(userId));
  if (!set || set.size === 0) return null;

  // return any one socket id
  return Array.from(set)[0];
};

export const isUserOnline = (userId) => {
  const set = onlineUsers.get(String(userId));
  return !!set && set.size > 0;
};

export const setupChatSocket = (io, socket) => {
  // ✅ JOIN
  socket.on("join", async ({ userId }) => {
    if (!userId) return;

    const safeUserId = String(userId);
    console.log('user id',safeUserId);
    

    const timer = disconnectTimers.get(safeUserId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(safeUserId);
    }

    // add socket id into set
    const prevSet = onlineUsers.get(safeUserId) || new Set();
    prevSet.add(socket.id);
    onlineUsers.set(safeUserId, prevSet);

    socketUsers.set(socket.id, safeUserId);
    socket.join(`user:${safeUserId}`);

    // ✅ DB update ONLY when user goes from offline -> online
    if (prevSet.size === 1) {
      try {
        await User.findByIdAndUpdate(
          safeUserId,
          { $set: { isOnline: true, lastSeen: null } },
          { new: false },
        );
      } catch (e) {
        console.log("isOnline true failed:", e.message);
      }

      socket.broadcast.emit("user-online", { userId: safeUserId });
    }

    socket.emit("socket-joined", {
      success: true,
      userId: safeUserId,
      socketId: socket.id,
    });

    socket.emit("online-users", {
      users: Array.from(onlineUsers.keys()).filter((id) => isUserOnline(id)),
    });

    console.log(`✅ User joined socket: ${safeUserId} -> ${socket.id}`);
  });

  // ✅ SEND MESSAGE (realtime only)
  socket.on("send-message", ({ receiverId, conversationId, message }) => {
    if (!receiverId || !conversationId || !message) return;

    const receiverSet = onlineUsers.get(String(receiverId));

    if (receiverSet && receiverSet.size > 0) {
     
      receiverSet.forEach((sid) => {
        io.to(sid).emit("receive-message", {
          conversationId: String(conversationId),
          message,
        });

        // ✅ FIX: inside loop
        io.to(sid).emit("conversation-updated", {
          conversationId: String(conversationId),
          lastMessage: message,
        });
      });

    }

    socket.emit("message-sent-realtime", {
      conversationId: String(conversationId),
      messageId: message?._id,
      deliveredToSocket: !!receiverSet && receiverSet.size > 0,
    });
  });

  // ✅ TYPING START
  socket.on("typing", ({ receiverId, conversationId, senderId }) => {
    if (!receiverId || !conversationId || !senderId) return;

    const receiverSet = onlineUsers.get(String(receiverId));
    if (receiverSet && receiverSet.size > 0) {
      receiverSet.forEach((sid) => {
        io.to(sid).emit("typing", {
          conversationId: String(conversationId),
          senderId: String(senderId),
        });
      });
    }
  });

  // ✅ TYPING STOP
  socket.on("stop-typing", ({ receiverId, conversationId, senderId }) => {
    if (!receiverId || !conversationId || !senderId) return;

    const receiverSet = onlineUsers.get(String(receiverId));
    if (receiverSet && receiverSet.size > 0) {
      receiverSet.forEach((sid) => {
        io.to(sid).emit("stop-typing", {
          conversationId: String(conversationId),
          senderId: String(senderId),
        });
      });
    }
  });

  // ✅ MARK SEEN (notify only)
  socket.on("mark-seen", ({ senderId, conversationId, messageIds, seenBy }) => {
    if (!senderId || !conversationId) return;

    const senderSet = onlineUsers.get(String(senderId));
    if (senderSet && senderSet.size > 0) {
      senderSet.forEach((sid) => {
        io.to(sid).emit("message-seen", {
          conversationId: String(conversationId),
          messageIds: Array.isArray(messageIds) ? messageIds : [],
          seenBy: seenBy ? String(seenBy) : null,
        });
      });
    }
  });

  // ✅ MESSAGE REACTION
  socket.on("message-reaction",({ conversationId, messageId, reactions, receiverId }) => {
      if (!conversationId || !messageId || !Array.isArray(reactions)) {
        return;
      }

      // receiver devices
      const receiverSet = onlineUsers.get(String(receiverId));

      if (receiverSet && receiverSet.size > 0) {
        receiverSet.forEach((sid) => {
          io.to(sid).emit("message-reaction-updated", {
            conversationId: String(conversationId),
            messageId: String(messageId),
            reactions,
          });
        });
      }

      // sender all devices
      const senderId = socketUsers.get(socket.id);

      if (senderId) {
        const senderSet = onlineUsers.get(String(senderId));

        if (senderSet && senderSet.size > 0) {
          senderSet.forEach((sid) => {
            io.to(sid).emit("message-reaction-updated", {
              conversationId: String(conversationId),
              messageId: String(messageId),
              reactions,
            });
          });
        }
      }
    },
  );

  // ✅ CHECK ONLINE
  socket.on("check-user-online", ({ userId }) => {
    if (!userId) return;

    socket.emit("check-user-online-result", {
      userId: String(userId),
      isOnline: isUserOnline(userId),
    });
  });

  // ✅ DISCONNECT
 

  socket.on("disconnect", async () => {
    const userId = socketUsers.get(socket.id);
    if (!userId) return;

    socketUsers.delete(socket.id);

    const set = onlineUsers.get(String(userId));
    if (set) {
      set.delete(socket.id);

      if (set.size > 0) {
        onlineUsers.set(String(userId), set);
        return;
      }

      onlineUsers.delete(String(userId));
    }

    // ❗ delay offline
    const timer = setTimeout(async () => {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.broadcast.emit("user-offline", {
          userId: String(userId),
        });

        console.log("❌ delayed offline:", userId);
      } catch (e) {}
    }, 15000); // ⏱ 15 sec delay

    disconnectTimers.set(userId, timer);
  });
};
