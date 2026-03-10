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


export default router;
