// FILE: src/routes/comment/comment.routes.js
import express from "express";
import {
  createComment,
  getPostComments,
  getCommentReplies,
  deleteComment,
  updateComment,
} from "../../controllers/comment/comment.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";

const router = express.Router();

// post comments
router.get("/:postId/comments",authGuard, getPostComments); // public (or protect if you want)
router.post("/:postId/comments", authGuard, createComment);

// replies
router.get("/:commentId/replies", getCommentReplies);

// delete
router.delete("/:commentId", authGuard, deleteComment);

// update comment 
router.put("/:commentId", authGuard, updateComment);

export default router;
