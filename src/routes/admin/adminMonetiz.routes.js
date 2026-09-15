import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import {
  adminListMonetization,
  adminMonetizationStatus,
  getSingleMonetization,
} from "../../controllers/admin/adminMonetiz.controller.js";
import { isAdminOrModerator } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();


// ✅ admin
router.get("/monetization/list", authGuard, isAdmin, adminListMonetization);
router.get("/monetization/:id", authGuard, isAdmin, getSingleMonetization);

router.post(
  "/monetization/:id/status",
  authGuard,
  isAdmin,
  adminMonetizationStatus,
);


export default router;
