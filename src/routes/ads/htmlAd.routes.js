import express from "express";
import {
  createAd,
  getAllAds,
  getAdById,
  updateAd,
  deleteAd,
} from "../../controllers/ads/htmlAd.controller.js"; // 🌟 নোট: ফাইলে অবশ্যই .js এক্সটেনশন দিতে হবে
import { authGuard } from "../../middleware/authMiddleware.js";

const router = express.Router();







router.post("/create", authGuard, createAd);
router.get("/get-all", authGuard, getAllAds);
router.get("/:id", authGuard, getAdById);
router.put("/update",authGuard, updateAd);
router.delete("/delete",authGuard, deleteAd);

export default router; 
