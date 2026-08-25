// routes/adView.routes.js

import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { recordAdView } from "../../controllers/ads/adView.controller.js";

const router = express.Router();

router.post("/:adId", authGuard, recordAdView);

export default router;
