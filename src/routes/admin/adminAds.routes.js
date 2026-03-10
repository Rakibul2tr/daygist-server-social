

import express from "express";
import {
  adminGetAds,
  adminGetSingleAd,
  adminUpdateAd,
  adminSoftDeleteAd,
  adminHardDeleteAd,
} from "../../controllers/admin/adminAds.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();

router.use(authGuard, isAdmin);

router.get("/ads", adminGetAds);
router.get("/ads/:adId", adminGetSingleAd);
router.patch("/ads/:adId", adminUpdateAd);
router.patch("/ads/:adId/soft", adminSoftDeleteAd);
router.delete("/ads/:adId/hard", adminHardDeleteAd);

export default router; // ✅ VERY IMPORTANT
