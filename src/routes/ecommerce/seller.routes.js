import { Router } from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

import {
  requestSeller,
  getMySellerInfo,
  adminGetSellerRequests,
  adminUpdateSellerStatus,
  adminDeleteSeller,
  getMySellerOrders,
  getMySellerOrderDetails,
  updateMySellerOrderStatus,
} from "../../controllers/ecommerce/seller.controller.js";
import { isSellerOrShopModerator } from "../../middleware/isSellerModerator.js";

const router = Router();

/* ===== seller ===== */
router.post("/seller/request", authGuard, requestSeller);
router.get("/seller/me", authGuard,isSellerOrShopModerator, getMySellerInfo);
router.get("/seller/orders", authGuard,isSellerOrShopModerator, getMySellerOrders);
router.get("/seller/orders/:id", authGuard,isSellerOrShopModerator, getMySellerOrderDetails);
router.patch("/seller/orders/:id/status", authGuard,isSellerOrShopModerator, updateMySellerOrderStatus);

/* ===== ADMIN ===== */
router.get(
  "/admin/seller-requests",
  authGuard,
  isAdmin,
  adminGetSellerRequests,
);
router.patch(
  "/admin/seller-requests/:id/status",
  authGuard,
  isAdmin,
  adminUpdateSellerStatus,
);
router.delete(
  "/admin/seller-requests/:id",
  authGuard,
  isAdmin,
  adminDeleteSeller,
);

export default router;
