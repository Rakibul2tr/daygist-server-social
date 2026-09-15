// routes/ecommerce/sellerModerator.routes.js
import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js"; // আপনার মেইন অথ মিডলওয়্যার
import {
  createShopModerator,
  getShopModerators,
  updateShopModeratorStatus,
} from "../../controllers/ecommerce/sellerModerator.controller.js";

const router = express.Router();

// সব রাউটেই প্রথমে লগইন চেক হবে
router.use(authGuard);

router.post("/shop-moderator", createShopModerator); // ১. শপ মডারেটর তৈরি
router.get("/shop-moderator", getShopModerators); // ২. নিজের সব শপ মডারেটরের লিস্ট দেখা
router.patch("/shop-moderator/:id/status", updateShopModeratorStatus); // ৩. স্টাফ অ্যাক্টিভ/ইনঅ্যাক্টিভ করা

export default router;
