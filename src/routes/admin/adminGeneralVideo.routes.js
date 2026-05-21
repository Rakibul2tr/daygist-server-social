

import express from "express";

import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import { adminGetVideos } from "../../controllers/admin/adminGeneralVideo.controller.js";

const router = express.Router();

router.use(authGuard, isAdmin);

router.get("/videos", adminGetVideos);

export default router; // ✅ VERY IMPORTANT
