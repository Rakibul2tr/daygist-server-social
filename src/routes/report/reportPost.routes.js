import { Router } from "express";
import {
  createPostReport,
  myReports,
  adminListReports,
  adminGetReport,
  adminUpdateReport,
  adminDeleteReport,
} from "../../controllers/report/reportPost.controller.js";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

const router = Router();

// USER
router.post("/posts/:postId", authGuard, createPostReport);
router.post(
  "/group/:groupId/post/:postId",
  authGuard,
  createPostReport,
);
router.get("/get/me", authGuard, myReports);

// ADMIN
router.get("/all-report-list", authGuard, isAdmin, adminListReports);
router.get("/single-report/:id", authGuard, isAdmin, adminGetReport);
router.patch("/single-report-up/:id", authGuard, isAdmin, adminUpdateReport);
router.delete("/single-report-delete/:id", authGuard, isAdmin, adminDeleteReport);

export default router;
