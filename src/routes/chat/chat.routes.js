import express from "express";
import {
  acceptConversationRequest,
  checkConversationExists,
  createOrGetAdminSupportConversation,
  createOrGetConversation,
  getConversationById,
  getMyConversations,
  getTotalUnseenCount,
} from "../../controllers/chat/conversation.controller.js";
import {
  getMessagesByConversation,
  sendMessage,
  markMessagesSeen,
  deleteMessage,
  getChatOnlineUnion,
  handleMessageReaction,
  editMessage,
} from "../../controllers/chat/message.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Conversation
 */
router.post("/conversations/create-or-get", authGuard, createOrGetConversation);
router.get("/conversations/my", authGuard, getMyConversations);
router.get("/conversations/:conversationId", authGuard, getConversationById);
router.patch(
  "/conversations/accept/:conversationId",
  authGuard,
  acceptConversationRequest,
);
router.get(
  "/conversations/:otherUserId/checkExisting",
  authGuard,
  checkConversationExists,
);


router.get("/users/chat-online", authGuard, getChatOnlineUnion);


/**
 * Messages
 */
router.get("/unseenCount", authGuard, getTotalUnseenCount);
router.get("/messages/:conversationId", authGuard, getMessagesByConversation);
router.post("/messages/send", authGuard, sendMessage);
router.patch("/messages/seen/:conversationId", authGuard, markMessagesSeen);
router.patch("/reaction/:messageId", authGuard, handleMessageReaction);
router.patch("/message/:messageId", authGuard, editMessage);


/**
 * Optional
 */
router.delete("/message/:messageId", authGuard, deleteMessage);


router.post("/conversations/support/create-or-get", authGuard, createOrGetAdminSupportConversation);

export default router;
