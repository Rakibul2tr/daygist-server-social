import express from "express";
import {
  createOrGetConversation,
  getConversationById,
  getMyConversations,
} from "../../controllers/chat/conversation.controller.js";
import {
  getMessagesByConversation,
  sendMessage,
  markMessagesSeen,
  deleteMessage,
  getChatOnlineUnion,
} from "../../controllers/chat/message.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Conversation
 */
router.post("/conversations/create-or-get", authGuard, createOrGetConversation);
router.get("/conversations/my", authGuard, getMyConversations);
router.get("/conversations/:conversationId", authGuard, getConversationById);

router.get("/users/chat-online", authGuard, getChatOnlineUnion);

/**
 * Messages
 */
router.get("/messages/:conversationId", authGuard, getMessagesByConversation);
router.post("/messages/send", authGuard, sendMessage);
router.patch("/messages/seen/:conversationId", authGuard, markMessagesSeen);

/**
 * Optional
 */
router.delete("/messages/:messageId", authGuard, deleteMessage);

export default router;
