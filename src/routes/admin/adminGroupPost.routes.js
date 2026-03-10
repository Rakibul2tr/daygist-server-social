import express from "express";
import {
  adminCreateGroupPost,
  adminGetGroupPosts,
  adminGetSingleGroupPost,
  adminUpdateGroupPost,
  adminDeleteGroupPost,
  adminGetAllGroupPosts,
} from "../../controllers/admin/adminGroupPost.controller.js";

import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();

router.use(authGuard, isAdmin);


// group posts
router.post("/:groupId/posts", adminCreateGroupPost);
router.get("/group-posts", adminGetAllGroupPosts);
router.get("/:groupId/posts", adminGetGroupPosts);
router.get("/:groupId/posts/:postId", adminGetSingleGroupPost);
router.patch("/:groupId/posts/:postId", adminUpdateGroupPost);
router.delete("/:groupId/posts/:postId", adminDeleteGroupPost);

export default router;
