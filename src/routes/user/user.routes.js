// FILE: src/routes/user/user.routes.js
import express from "express";
import {
  googleLogin,
  completeProfile,
  getUserById,
  getMyPosts,
  getUserPosts,
  getMe,
  getMyPhotos,
  getUserPhotos,
  getMyReels,
  getUserReels,
  updateMyAvatar,
  updateMyCover,
  updateMeProfile,
  getMyVideos,
  getAllUsers,
  deleteUserById,
  deleteMyPost,
  updateMyPost,
  searchUsers,
} from "../../controllers/user/user.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import multer from "multer";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = express.Router();

const uploadImg = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

router.post("/google", googleLogin);
router.patch("/other-info", authGuard, completeProfile);
router.get("/me", authGuard, getMe);            // ✅ no params
router.get("/all-users",authGuard, isAdmin, getAllUsers);            // ✅ no params
router.get("/:userId", authGuard, getUserById); // ✅ params needed
router.delete("/:userId", authGuard, isAdmin, deleteUserById);
router.post("/search", authGuard, searchUsers);
// update me 
router.patch("/me", authGuard, updateMeProfile);
// ✅ Avatar
router.post("/me/avatar", authGuard, uploadImg.single("file"), updateMyAvatar);
// ✅ Cover
router.post("/me/cover", authGuard, uploadImg.single("file"), updateMyCover);

// users post==========
router.get("/me/posts", authGuard, getMyPosts);           // ✅ my post
router.delete("/me/posts/:id", authGuard, deleteMyPost); 
router.patch("/me/posts/:id", authGuard, updateMyPost);          // ✅ my post
router.get("/:userId/posts", authGuard, getUserPosts);    // ✅ অন্য user এর পোস্ট

// ✅ photos
router.get("/me/photos", authGuard, getMyPhotos);
router.get("/:userId/photos", authGuard, getUserPhotos);

// ✅ reels
router.get("/me/reels", authGuard, getMyReels);
router.get("/:userId/reels", authGuard, getUserReels);
router.get("/videos/me", authGuard, getMyVideos);

export default router;
