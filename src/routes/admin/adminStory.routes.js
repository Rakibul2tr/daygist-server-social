// FILE: src/routes/admin/adminStory.routes.js
import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

import {
  adminGetAllStories,
  adminGetStoriesByUser,
  adminDeleteStory,
  adminRestoreStory,
  adminHardDeleteStory,
  adminCreateStory,
} from "../../controllers/admin/adminStory.controller.js";

const router = express.Router();

// list
router.get("/stories", authGuard, isAdmin, adminGetAllStories);
router.get("/stories/user/:userId", authGuard, isAdmin, adminGetStoriesByUser);

// create (optional)
router.post("/stories", authGuard, isAdmin, adminCreateStory);

// delete/restore
router.delete("/stories/:id", authGuard, isAdmin, adminDeleteStory);
router.patch("/stories/:id/restore", authGuard, isAdmin, adminRestoreStory);

// hard delete
router.delete("/stories/:id/hard", authGuard, isAdmin, adminHardDeleteStory);

export default router;
