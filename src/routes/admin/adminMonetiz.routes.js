import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import {
  adminApproveMonetization,
  adminListMonetization,
  adminRejectMonetization,
} from "../../controllers/admin/adminMonetiz.controller.js";

const router = express.Router();


// ✅ admin
router.get("/monetization/list", authGuard, isAdmin, adminListMonetization);
router.post(
  "/monetization/:id/approve",
  authGuard,
  isAdmin,
  adminApproveMonetization,
);
router.post(
  "/monetization/:id/reject",
  authGuard,
  isAdmin,
  adminRejectMonetization,
);

export default router;
