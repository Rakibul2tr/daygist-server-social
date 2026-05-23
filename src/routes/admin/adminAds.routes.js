import express from "express";
import {
  createAd,
  getAllAds,
  getActiveAds,
  updateAd,
  deleteAd,
  trackAd,
} from "../../controllers/admin/adminAds.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js"; 

const router = express.Router();


router.post("/create", authGuard, createAd);
router.get("/all", authGuard, getAllAds);
router.put("/update/:id", authGuard, updateAd);
router.delete("/delete/:id", authGuard, deleteAd);


router.get("/active", getActiveAds);


router.post("/track/:id", trackAd);

export default router;
