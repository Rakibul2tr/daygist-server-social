// import User from "../models/user/user.model.js";
// import Conversation from "../models/chat/conversation.model.js";

// // ✅ multi-device safe
// const onlineUsers = new Map(); // userId -> Set(socketId)
// const socketUsers = new Map(); // socketId -> userId
// const disconnectTimers = new Map(); // userId -> timeout

// export const getReceiverSocketId = (userId) => {
//   const set = onlineUsers.get(String(userId));
//   if (!set || set.size === 0) return null;

//   // return any one socket id
//   return Array.from(set)[0];
// };

// export const isUserOnline = (userId) => {
//   const set = onlineUsers.get(String(userId));
//   return !!set && set.size > 0;
// };


// export const setupChatSocket = (io, socket) => {
//   // ✅ JOIN
//   socket.on("join", async ({ userId }) => {
//     if (!userId) return;

//     const safeUserId = String(userId);
//     console.log('user id', safeUserId);

//     const timer = disconnectTimers.get(safeUserId);
//     if (timer) {
//       clearTimeout(timer);
//       disconnectTimers.delete(safeUserId);
//     }

//     // add socket id into set
//     const prevSet = onlineUsers.get(safeUserId) || new Set();
//     prevSet.add(socket.id);
//     onlineUsers.set(safeUserId, prevSet);

//     socketUsers.set(socket.id, safeUserId);
//     socket.join(`user:${safeUserId}`);

//     // ✅ DB update ONLY when user goes from offline -> online
//     if (prevSet.size === 1) {
//       try {
//         await User.findByIdAndUpdate(
//           safeUserId,
//           { $set: { isOnline: true, lastSeen: null } },
//           { new: false },
//         );
//       } catch (e) {
//         console.log("isOnline true failed:", e.message);
//       }

//       socket.broadcast.emit("user-online", { userId: safeUserId });
//     }

//     socket.emit("socket-joined", {
//       success: true,
//       userId: safeUserId,
//       socketId: socket.id,
//     });

//     socket.emit("online-users", {
//       users: Array.from(onlineUsers.keys()).filter((id) => isUserOnline(id)),
//     });

//     console.log(`✅ User joined socket: ${safeUserId} -> ${socket.id}`);
//   });

//   // ✅ SEND MESSAGE (realtime only)
//   socket.on("send-message", ({ receiverId, conversationId, message }) => {
//     console.log(
//       "SOCKET SEND:",
//       message.messageType,
//       message.text,
//       message?.media?.url,
//     );
//     // Input validation
//     if (!receiverId || !conversationId || !message) {
//       socket.emit("message-error", {
//         error: "Missing required fields: receiverId, conversationId, or message",
//       });
//       return;
//     }
//     if (message.messageType === "text") {
//       if (!message.text || !message.text.trim()) {
//         return;
//       }
//     }

//     // image/voice হলে media লাগবে
//     if (
//       ["image", "voice"].includes(message.messageType) &&
//       !message?.media?.url
//     ) {
//       socket.emit("message-error", {
//         error:
//           "Problem image or voice",
//       });
//       return;
//     }

//     const receiverSet = onlineUsers.get(String(receiverId));

//     // if (receiverSet && receiverSet.size > 0) {
//     //   receiverSet.forEach((sid) => {
//     //     io.to(sid).emit("receive-message", {
//     //       conversationId: String(conversationId),
//     //       message,
//     //     });

//     //     // ✅ FIX: inside loop
//     //     io.to(sid).emit("conversation-updated", {
//     //       conversationId: String(conversationId),
//     //       lastMessage: message,
//     //     });
//     //   });
//     // }
//      if (receiverSet?.size) {
//        receiverSet.forEach((sid) => {
//          io.to(sid).emit("receive-message", {
//            conversationId: String(conversationId),
//            message,
//          });

//          io.to(sid).emit("conversation-updated", {
//            conversationId: String(conversationId),
//            lastMessage: message,
//          });
//        });
//      }

//     socket.emit("message-sent-realtime", {
//       conversationId: String(conversationId),
//       messageId: message?._id,
//       deliveredToSocket: !!receiverSet && receiverSet.size > 0,
//     });
//   });

//   // ✅ TYPING START
//   socket.on("typing", ({ receiverId, conversationId, senderId }) => {
//     if (!receiverId || !conversationId || !senderId) return;

//     const receiverSet = onlineUsers.get(String(receiverId));
//     if (receiverSet && receiverSet.size > 0) {
//       receiverSet.forEach((sid) => {
//         io.to(sid).emit("typing", {
//           conversationId: String(conversationId),
//           senderId: String(senderId),
//         });
//       });
//     }
//   });

//   // ✅ TYPING STOP
//   socket.on("stop-typing", ({ receiverId, conversationId, senderId }) => {
//     if (!receiverId || !conversationId || !senderId) return;

//     const receiverSet = onlineUsers.get(String(receiverId));
//     if (receiverSet && receiverSet.size > 0) {
//       receiverSet.forEach((sid) => {
//         io.to(sid).emit("stop-typing", {
//           conversationId: String(conversationId),
//           senderId: String(senderId),
//         });
//       });
//     }
//   });

//   // ✅ MARK SEEN (notify only)
//   socket.on("mark-seen", ({ senderId, conversationId, messageIds, seenBy }) => {
//     if (!senderId || !conversationId) return;

//     // Validate messageIds if present
//     const validMessageIds =
//       Array.isArray(messageIds) && messageIds.every((id) => typeof id === "string");

//     const senderSet = onlineUsers.get(String(senderId));
//     if (senderSet && senderSet.size > 0) {
//       senderSet.forEach((sid) => {
//         io.to(sid).emit("message-seen", {
//           conversationId: String(conversationId),
//           messageIds: validMessageIds ? messageIds : [],
//           seenBy: seenBy ? String(seenBy) : null,
//         });
//       });
//     }
//   });

//   // ✅ MESSAGE REACTION
//   socket.on(
//     "message-reaction",
//     ({ conversationId, messageId, reactions, receiverId }) => {
//       if (
//         !conversationId ||
//         !messageId ||
//         !Array.isArray(reactions) ||
//         !receiverId
//       ) {
//         // Optional: emit error to sender if needed
//         return;
//       }

//       // receiver devices
//       const receiverSet = onlineUsers.get(String(receiverId));

//       if (receiverSet && receiverSet.size > 0) {
//         receiverSet.forEach((sid) => {
//           io.to(sid).emit("message-reaction-updated", {
//             conversationId: String(conversationId),
//             messageId: String(messageId),
//             reactions,
//           });
//         });
//       }

//       // sender all devices
//       const senderId = socketUsers.get(socket.id);

//       if (senderId) {
//         const senderSet = onlineUsers.get(String(senderId));

//         if (senderSet && senderSet.size > 0) {
//           senderSet.forEach((sid) => {
//             io.to(sid).emit("message-reaction-updated", {
//               conversationId: String(conversationId),
//               messageId: String(messageId),
//               reactions,
//             });
//           });
//         }
//       }
//     }
//   );

//   // ✅ CHECK ONLINE
//   socket.on("check-user-online", ({ userId }) => {
//     if (!userId) return;

//     socket.emit("check-user-online-result", {
//       userId: String(userId),
//       isOnline: isUserOnline(userId),
//     });
//   });

//   // ✅ DISCONNECT

//   socket.on("disconnect", async () => {
//     const userId = socketUsers.get(socket.id);
//     if (!userId) return;

//     socketUsers.delete(socket.id);

//     const set = onlineUsers.get(String(userId));
//     if (set) {
//       set.delete(socket.id);

//       if (set.size > 0) {
//         onlineUsers.set(String(userId), set);
//         return;
//       }

//       onlineUsers.delete(String(userId));
//     }

//     // ❗ delay offline
//     const timer = setTimeout(async () => {
//       try {
//         await User.findByIdAndUpdate(userId, {
//           isOnline: false,
//           lastSeen: new Date(),
//         });

//         socket.broadcast.emit("user-offline", {
//           userId: String(userId),
//         });

//         console.log("❌ delayed offline:", userId);
//       } catch (e) {
//         console.error(
//           `Error updating user offline status for ${userId}:`,
//           e
//         );
//       }
//     }, 15000); // ⏱ 15 sec delay

//     disconnectTimers.set(userId, timer);
//   });
// };



import User from "../models/user/user.model.js";
import Conversation from "../models/chat/conversation.model.js";

// ✅ multi-device safe
const onlineUsers = new Map(); // userId -> Set(socketId)
const socketUsers = new Map(); // socketId -> userId
const disconnectTimers = new Map(); // userId -> timeout

export const getReceiverSocketId = (userId) => {
  const set = onlineUsers.get(String(userId));
  if (!set || set.size === 0) return null;
  return Array.from(set)[0];
};

export const isUserOnline = (userId) => {
  const set = onlineUsers.get(String(userId));
  return !!set && set.size > 0;
};

// 🎯 হেল্পার ফাংশন: চ্যাট রুমে বায়ার, সেলার ও মডারেটর যে যে অনলাইনে আছে সবার সকেট আইডি বের করা
const broadcastToConversation = async (
  io,
  conversationId,
  currentSenderId,
  eventName,
  payload,
) => {
  try {
    const conv = await Conversation.findById(conversationId).lean();
    if (!conv) return;

    // চ্যাটের সাথে জড়িত সম্ভাব্য ৩টি আইডি-র সেট তৈরি
    const targets = new Set();

    // ১. অফিশিয়াল ২ জন মেম্বার (Buyer & Seller)
    if (conv.participants) {
      conv.participants.forEach((p) => targets.add(String(p)));
    }
    // ২. অ্যাসাইন করা শপ মডারেটর (যদি থাকে)
    if (conv.assignedAgent) {
      targets.add(String(conv.assignedAgent));
    }

    // ৩. যে নিজে মেসেজ/টাইপিং পাঠাচ্ছে, তাকে বাদ দিয়ে বাকিদের সকেট আইডিতে পুশ করা
    targets.delete(String(currentSenderId));

    targets.forEach((userId) => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets && userSockets.size > 0) {
        userSockets.forEach((sid) => {
          io.to(sid).emit(eventName, payload);
        });
      }
    });
  } catch (err) {
    console.error("🔴 Socket Broadcast Error:", err.message);
  }
};

export const setupChatSocket = (io, socket) => {
  // ✅ JOIN
  socket.on("join", async ({ userId }) => {
    if (!userId) return;
    const safeUserId = String(userId);

    const timer = disconnectTimers.get(safeUserId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(safeUserId);
    }

    const prevSet = onlineUsers.get(safeUserId) || new Set();
    prevSet.add(socket.id);
    onlineUsers.set(safeUserId, prevSet);

    socketUsers.set(socket.id, safeUserId);
    socket.join(`user:${safeUserId}`);

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

  // ✅ SEND MESSAGE (৩ জনের সিঙ্ক ফিক্স)
  socket.on("send-message", async ({ receiverId, conversationId, message }) => {
    console.log("SOCKET SEND:", message.messageType, message.text);

    if (!conversationId || !message) {
      socket.emit("message-error", { error: "Missing required fields" });
      return;
    }

    if (
      message.messageType === "text" &&
      (!message.text || !message.text.trim())
    )
      return;
    if (
      ["image", "voice"].includes(message.messageType) &&
      !message?.media?.url
    ) {
      socket.emit("message-error", { error: "Problem image or voice" });
      return;
    }

    const senderId = socketUsers.get(socket.id);

    // 🎯 মেইন ফিক্স: হার্ডকোডেড ১ জন রিসিভারের বদলে চ্যাটের বায়ার/সেলার/মডারেটর সবার ডিভাইসে মেসেজ পুশ হবে
    await broadcastToConversation(
      io,
      conversationId,
      senderId,
      "receive-message",
      {
        conversationId: String(conversationId),
        message,
      },
    );

    await broadcastToConversation(
      io,
      conversationId,
      senderId,
      "conversation-updated",
      {
        conversationId: String(conversationId),
        lastMessage: message,
      },
    );

    // মেম্বাররা অনলাইনে আছে কি না তা চেক করে রিয়েলটাইম ডেলিভারি স্ট্যাটাস ট্র্যাকিং
    const receiverSet = onlineUsers.get(String(receiverId));
    socket.emit("message-sent-realtime", {
      conversationId: String(conversationId),
      messageId: message?._id,
      deliveredToSocket: !!receiverSet && receiverSet.size > 0,
    });
  });

  // ✅ TYPING START (৩ জনের সিঙ্ক ফিক্স)
  socket.on("typing", async ({ conversationId, senderId }) => {
    if (!conversationId || !senderId) return;

    await broadcastToConversation(io, conversationId, senderId, "typing", {
      conversationId: String(conversationId),
      senderId: String(senderId),
    });
  });

  // ✅ TYPING STOP (৩ জনের সিঙ্ক ফিক্স)
  socket.on("stop-typing", async ({ conversationId, senderId }) => {
    if (!conversationId || !senderId) return;

    await broadcastToConversation(io, conversationId, senderId, "stop-typing", {
      conversationId: String(conversationId),
      senderId: String(senderId),
    });
  });

  // ✅ MARK SEEN
  socket.on("mark-seen", ({ senderId, conversationId, messageIds, seenBy }) => {
    if (!senderId || !conversationId) return;
    const validMessageIds =
      Array.isArray(messageIds) &&
      messageIds.every((id) => typeof id === "string");

    const senderSet = onlineUsers.get(String(senderId));
    if (senderSet && senderSet.size > 0) {
      senderSet.forEach((sid) => {
        io.to(sid).emit("message-seen", {
          conversationId: String(conversationId),
          messageIds: validMessageIds ? messageIds : [],
          seenBy: seenBy ? String(seenBy) : null,
        });
      });
    }
  });

  // ✅ MESSAGE REACTION
  socket.on(
    "message-reaction",
    ({ conversationId, messageId, reactions, receiverId }) => {
      if (
        !conversationId ||
        !messageId ||
        !Array.isArray(reactions) ||
        !receiverId
      )
        return;

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

    const timer = setTimeout(async () => {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        socket.broadcast.emit("user-offline", { userId: String(userId) });
        console.log("❌ delayed offline:", userId);
      } catch (e) {
        console.error(`Error updating user offline status for ${userId}:`, e);
      }
    }, 15000);

    disconnectTimers.set(userId, timer);
  });
};
