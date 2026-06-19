import express from "express";
import {
  adminListSellers,
  getSingleSellerRequest,
  adminSellerStatusUpdate,
} from "../../controllers/admin/admin.seller.controller.js"; // আপনার কন্ট্রোলার ফাইলের সঠিক পাথ দিন
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";


const router = express.Router();


/** ==========================================
 *  🛡️ ADMIN SIDE ROUTES (শুধু অ্যাডমিনদের জন্য)
 *  ========================================== */

// ৩. সব সেলার রিকোয়েস্টের লিস্ট দেখা [ফিল্টার করা যাবে: ?status=pending] (GET /api/seller/admin/list)
router.get("/seller/list", authGuard, isAdmin, adminListSellers);

// ৪. নির্দিষ্ট একটি সেলার রিকোয়েস্টের বিস্তারিত দেখা (GET /api/seller/admin/request/:id)
router.get(
  "/seller/request/:id",
  authGuard,
  isAdmin,
  getSingleSellerRequest,
);

// ৫. সেলার রিকোয়েস্ট এপ্রুভ বা রিজেক্ট করা (PUT /api/seller/admin/status/:id)
router.post("/seller/:id/status", authGuard, isAdmin, adminSellerStatusUpdate);

export default router;
