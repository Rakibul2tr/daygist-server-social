import { Router } from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  followStatus,
} from "../../controllers/follow/follow.controller.js";

const router = Router();

// follow/unfollow
router.post("/:userId", authGuard, followUser);
router.delete("/:userId", authGuard, unfollowUser);

// lists (public)
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

// optional
router.get("/:userId/status", authGuard, followStatus);

export default router;
