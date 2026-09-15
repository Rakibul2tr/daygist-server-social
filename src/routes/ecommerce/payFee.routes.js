import express from "express";

import { authGuard } from "../../middleware/authMiddleware.js";
import { payProductFee } from "../../controllers/ecommerce/sellerFee.controller.js";
import { isSellerOrShopModerator } from "../../middleware/isSellerModerator.js";

const router = express.Router();

// pay fee for product upload and boost
router.post("/pay-fee/:id", authGuard,isSellerOrShopModerator, payProductFee);

export default router;
