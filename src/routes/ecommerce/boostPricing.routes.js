// src/routes/BoostPricing.routes.js
import express from "express";
import {
  createBoostPricing,
  getAllBoostPricing,
  getBoostByTier,
  updateBoostPricing,
  deleteBoostPricing,
} from "../../controllers/ecommerce/boostPricing.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();

// CREATE
router.post("/",authGuard,isAdmin, createBoostPricing);

// GET ALL
router.get("/",authGuard, getAllBoostPricing);

// // GET BY TIER
router.get("/:tier", authGuard,isAdmin, getBoostByTier);

// UPDATE
router.patch("/:id", authGuard,isAdmin, updateBoostPricing);

// DELETE (soft)
router.delete("/:id", authGuard,isAdmin, deleteBoostPricing);

export default router;
