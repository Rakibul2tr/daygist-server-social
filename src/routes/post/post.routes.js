import { Router } from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import {
  createPost,
  updatePost,
  deletePost,
  getPostById,
  getFeed,
  savePost,
  unsavePost,
  getSavedPosts,
} from "../../controllers/post/post.controller.js";
import { getPostLikes, likePost, unlikePost } from "../../controllers/post/postLike.controller.js";
import { addView } from "../../controllers/post/videoView.controller.js";
import { getPostShares, sharePost } from "../../controllers/share/share.contoller.js";

const router = Router();

// feed
router.get("/feed", authGuard, getFeed);

// post CRUD
router.post("/create", authGuard, createPost);
router.patch("/:id", authGuard, updatePost);
router.delete("/:id/delete", authGuard, deletePost);
router.get("/:id", getPostById);

// save/bookmark
router.post("/:id/save", authGuard, savePost);
router.delete("/:id/save", authGuard, unsavePost);
router.get("/me/saved/list", authGuard, getSavedPosts);


// like share

router.post("/:postId/like", authGuard, likePost);
router.delete("/:postId/like", authGuard, unlikePost);
router.get("/:postId/likes", authGuard, getPostLikes);

router.post("/:postId/share", authGuard, sharePost);
router.get("/:postId/shares", authGuard, getPostShares);

// video view count
router.post("/:postId/view", authGuard, addView);



export default router;
