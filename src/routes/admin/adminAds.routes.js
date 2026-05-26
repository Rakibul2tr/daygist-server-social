import express from "express";
import {
  createAd,
  getAllAds,
  getActiveAds,
  updateAd,
  deleteAd,
  trackAd,
  updateAdStatus,
} from "../../controllers/admin/adminAds.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js"; 
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();


router.post("/create", authGuard,isAdmin, createAd);
router.get("/all", authGuard, getAllAds);
router.put("/update/:id", authGuard,isAdmin, updateAd);
router.delete("/delete/:id", authGuard,isAdmin, deleteAd);


router.get("/active",authGuard, getActiveAds);


router.post("/track/:id",authGuard, trackAd);

router.patch("/ads/:id/status", authGuard, isAdmin, updateAdStatus);


export default router;
