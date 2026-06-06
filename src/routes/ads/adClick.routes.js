import express from "express";
import { addAdClick } from "../../controllers/ads/adClick.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
const router = express.Router();

router.post("/:postId", authGuard, addAdClick);

export default router;
