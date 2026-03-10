import express from "express";


import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import { getWalletSettings, updateWalletSettings } from "../../controllers/admin/walletSettings.controller.js";

const router = express.Router();

router.use(authGuard, isAdmin);

router.get( "/wallet-settings",getWalletSettings);

router.patch( "/wallet-settings", updateWalletSettings);

export default router;
