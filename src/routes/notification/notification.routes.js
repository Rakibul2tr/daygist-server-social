import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";

import {
  getNotifications,
  markNotificationSeen,
  markAllSeen,
} from "../../controllers/notification/notification.controller.js";

const router = express.Router();

// list (cursor pagination)
router.get("/", authGuard, getNotifications);

// single seen
router.post("/:id/seen", authGuard, markNotificationSeen);

// mark all seen
router.post("/mark-all-seen", authGuard, markAllSeen);

export default router;
