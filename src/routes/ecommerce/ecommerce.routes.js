import { Router } from "express";

import {
  getActiveBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../../controllers/ecommerce/ecom.banner.controller.js";

import {
  createCategory,
  updateCategory,
  getCategoryTree,
} from "../../controllers/ecommerce/ecom.category.controller.js";

import {
  getProductDetails,
  newArrivals,
  topSelling,
  featured,
  listProducts,
  sellerCreateProduct,
  sellerUpdateProduct,
  sellerSoftDeleteProduct,
  sellerGetMyProducts,
  adminSetFeatured,
  listProductsByIds,
  adminUpdateProductStatus,
  adminListPendingProducts,
  adminListAllProducts,
  getRelatedProducts,
  adminGetSingleProduct,
} from "../../controllers/ecommerce/ecom.product.controller.js";

import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import { isSellerApproved } from "../../middleware/isSellerApproved.js";

const router = Router();

/* =========================
   PUBLIC (Buyer) APIs
========================= */

// Home banners
router.get("/banners", getActiveBanners);
router.post("/admin/banners", authGuard, isAdmin, createBanner);
router.patch("/admin/banners/:id", authGuard, isAdmin, updateBanner);
router.delete("/admin/banners/:id", authGuard, isAdmin, deleteBanner);


// Products
router.get("/products", listProducts);
router.get("/products/featured", featured);
router.get("/products/top-selling", topSelling);
router.get("/products/new-arrivals", newArrivals);
router.get("/products/:id",authGuard, getProductDetails);
router.post("/products/by-ids", listProductsByIds);
router.get("/products/:id/related", getRelatedProducts);

// Products
router.post("/seller/products", authGuard,isSellerApproved,  sellerCreateProduct);
router.get("/seller/products", authGuard,isSellerApproved, sellerGetMyProducts);
router.patch("/seller/products/:id", authGuard,isSellerApproved,  sellerUpdateProduct);
router.delete(
  "/seller/products/:id",
  authGuard,
  isSellerApproved,
  sellerSoftDeleteProduct,
);

/* =========================
   ADMIN APIs (Setup only) featured macks
========================= */

router.get("/admin/AllProducts", authGuard, isAdmin, adminListAllProducts);
router.get(
  "/admin/products/pending",
  authGuard,
  isAdmin,
  adminListPendingProducts,
);
router.get("/admin/products/:id", authGuard, isAdmin, adminGetSingleProduct);
router.patch(
  "/admin/products/:id/status",
  authGuard,
  isAdmin,
  adminUpdateProductStatus,
);



// Categories
// Category tree (Main -> Sub -> Child)
router.get("/categories/tree",authGuard, getCategoryTree);
router.post("/admin/categories",authGuard, isAdmin, createCategory);
router.patch("/admin/categories/:id",authGuard, isAdmin, updateCategory);



export default router;
