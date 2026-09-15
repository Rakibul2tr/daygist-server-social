// routes/adminModeratorRoutes.js
import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js"; // আপনার auth middleware
import { isAdmin, isAdminOrModerator } from "../../middleware/isAdminMiddleware.js"; // আপনার isAdmin middleware
import {
  createModerator,
  getAllModerators,
  updateModeratorStatus,
  updateModeratorPermissions,
  getAllOrdersForAdminModerator,
  getOrderDetailsForAdminModerator,
} from "../../controllers/admin/adminModeratorController.js"; // আপনার কন্ট্রোলার ফাংশনগুলি


const router = express.Router();



router.post("/create-moderator",isAdmin, createModerator); // ১. মডারেটর তৈরি
router.get("/all-moderators", isAdmin, getAllModerators); // ২. সব মডারেটরের লিস্ট দেখা
router.patch("/status/:id", isAdmin, updateModeratorStatus); // ৩. অ্যাক্টিভ/ইনঅ্যাক্টিভ করা
router.put("/permissions/:id", isAdmin, updateModeratorPermissions); // ৪. পারমিশন দেওয়া/আপডেট করা


// moderator access control routes
router.get(
  "/all-orders-for-admin-moderator",
  authGuard,
  isAdminOrModerator,
  getAllOrdersForAdminModerator,
); 

router.get(
  "/orders/:id",
  authGuard,
  isAdminOrModerator,
  getOrderDetailsForAdminModerator,
);

export default router;
