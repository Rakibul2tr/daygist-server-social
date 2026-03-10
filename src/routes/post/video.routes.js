import { Router } from "express";
import { getGeneralVideos, getReelsVideos } from "../../controllers/post/videoFeed.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import { uploadLongVideo } from "../../services/multer.config/multer.config.js";
import { createLongVideoPost } from "../../controllers/post/post.controller.js";
import { trackVideoInterest } from "../../controllers/post/videoInterest.controller.js";

const router = Router();
router.get("/feed/general", authGuard, getGeneralVideos);
// router.get("/feed/general/:id", authGuard, getGeneralVideoById);

router.get("/feed/reels", authGuard, getReelsVideos);

// long video post create
router.post("/video/upload",authGuard,
  uploadLongVideo.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createLongVideoPost
);

router.post("/interest", authGuard, trackVideoInterest);

export default router;