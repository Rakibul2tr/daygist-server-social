import express from "express";
import {
  createGroupPost,
  getGroupPosts,
  getSingleGroupPost,
  updateGroupPost,
  deleteGroupPost,
  getMyGroupsPost,
} from "../../controllers/group/groupPost.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import { getPostLikes, likePost, unlikePost } from "../../controllers/group/groupPostLike.controller.js";
import { getPostShares, sharePost } from "../../controllers/group/groupPostShare.controller.js";

const router = express.Router();

// create group post
router.post("/:groupId/posts", authGuard, createGroupPost);
// get group post particular
router.get("/:groupId/posts", authGuard, getGroupPosts);
// get my create group and joined group posts 
router.get("/myCreate-joined-post", authGuard, getMyGroupsPost);
// post details
router.get("/:groupId/posts/:postId", authGuard, getSingleGroupPost);
// post update
router.patch("/:groupId/posts/:postId", authGuard, updateGroupPost);
// post delete
router.delete("/:groupId/posts/:postId", authGuard, deleteGroupPost);


// like share

router.post("/:postId/like", authGuard, likePost);
router.delete("/:postId/like", authGuard, unlikePost);
router.get("/:postId/likes", authGuard, getPostLikes);

router.post("/:postId/share", authGuard, sharePost);
router.get("/:postId/shares", authGuard, getPostShares);

export default router;
