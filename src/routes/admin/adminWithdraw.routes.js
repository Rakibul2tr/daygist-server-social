import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import {
  adminGetAllWithdraws,
  adminApproveWithdraw,
  adminRejectWithdraw,
} from "../../controllers/admin/adminWithdraw.controller.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();

// GET /admin/withdraws?status=pending&limit=20&cursor=...
router.get("/all-withdraw", authGuard, isAdmin, adminGetAllWithdraws);

// PATCH /admin/withdraws/:id/approve  { note? }
router.patch("/:id/approve",authGuard,isAdmin,adminApproveWithdraw);

// PATCH /admin/withdraws/:id/reject  { note: "reason" }
router.patch("/:id/reject", authGuard, isAdmin, adminRejectWithdraw);

export default router;
