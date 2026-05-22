

import express from "express";

import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import { getSetting, updateSetting } from "../../controllers/admin/adminSetting.controller.js";

const router = express.Router();

router.use(authGuard, isAdmin);

router.get("/settings",authGuard, getSetting);

router.post("/settings", authGuard, isAdmin, updateSetting);

export default router; // ✅ VERY IMPORTANT
