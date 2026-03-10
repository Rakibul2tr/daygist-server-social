import { Router } from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import {
  createStory,
  getUserStories,
  markStorySeen,
  deleteStory,
  getStoryFeed,
} from "../../controllers/stories/story.controller.js";

const router = Router();

router.post("/", authGuard, createStory);
router.get("/feed", authGuard, getStoryFeed);
router.get("/:userId", authGuard, getUserStories);
router.post("/:id/seen", authGuard, markStorySeen);
router.delete("/:id", authGuard, deleteStory);

export default router;
