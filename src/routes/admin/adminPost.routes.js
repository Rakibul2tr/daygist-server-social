// FILE: src/routes/admin/adminPost.routes.js
import express from "express";


import {
  adminGetAllPosts,
  adminGetPostById,
  adminUpdatePost,
  adminDeletePost,
  adminRestorePost,
  adminHardDeletePost,
} from "../../controllers/admin/adminPost.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();

// ✅ Admin posts
router.get("/posts", authGuard, isAdmin, adminGetAllPosts);
router.get("/posts/:id", authGuard, isAdmin, adminGetPostById);
router.patch("/posts/:id", authGuard, isAdmin, adminUpdatePost);

// delete/restore
router.delete("/posts/:id", authGuard, isAdmin, adminDeletePost);
router.patch("/posts/:id/restore", authGuard, isAdmin, adminRestorePost);

// optional hard delete
router.delete("/posts/:id/hard", authGuard, isAdmin, adminHardDeletePost);

export default router;
