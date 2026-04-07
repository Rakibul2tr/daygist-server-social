import { Router } from "express";
import { getGeneralVideos, getReelsVideos } from "../../controllers/post/videoFeed.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import { uploadLongVideo } from "../../services/multer.config/multer.config.js";
import { createLongVideoPost, searchVideos } from "../../controllers/post/post.controller.js";
import { trackVideoInterest } from "../../controllers/post/videoInterest.controller.js";

const router = Router();
router.get("/feed/general", authGuard, getGeneralVideos);
router.get("/feed/reels", authGuard, getReelsVideos);

router.post("/video/upload", authGuard, createLongVideoPost);
router.get("/search",authGuard, searchVideos);

router.post("/interest", authGuard, trackVideoInterest);

export default router;