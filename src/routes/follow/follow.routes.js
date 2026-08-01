import { Router } from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  followStatus,
  getCircle,
  getBlockedUsers,
  blockUser,
  unblockUser,
} from "../../controllers/follow/follow.controller.js";

const router = Router();

// follow/unfollow
router.post("/:userId", authGuard, followUser);
router.delete("/:userId", authGuard, unfollowUser);

// lists (public)
router.get("/:userId/followers",authGuard, getFollowers);
router.get("/:userId/following",authGuard, getFollowing);
router.get("/circle/:userId", authGuard, getCircle);

// block
router.post("/block/:userId", authGuard, blockUser);
router.delete("/block/:userId", authGuard, unblockUser);
router.get("/blocked", authGuard, getBlockedUsers);

// optional
router.get("/:userId/status", authGuard, followStatus);

export default router;
