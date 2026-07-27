import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import {
  // adminApproveMonetization,
  // adminListMonetization,
  // adminRejectMonetization,
  applyMonetization,
  getMyMonetization,
} from "../../controllers/monetization/monetization.controller.js";
import multer from "multer";
import { getMyVideoEarnings } from "../../controllers/monetization/earning.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ user
router.post(
  "/apply",
  authGuard,
  upload.fields([
    { name: "nidFront", maxCount: 1 },
    { name: "nidBack", maxCount: 1 },
  ]),
  applyMonetization
);
router.get("/me", authGuard, getMyMonetization);
router.get("/my-video-earnings", authGuard, getMyVideoEarnings);

// monetization act // admin
// get all  monetization // admin



export default router;
