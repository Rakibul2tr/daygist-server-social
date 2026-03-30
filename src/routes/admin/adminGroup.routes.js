import express from "express";

import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";
import {
  adminCreateGroup,
  adminGetAllGroups,
  adminGetGroupDetails,
  adminGetMyYourGroups,
  adminHardDeleteGroup,
  adminRestoreGroup,
  adminSoftDeleteGroup,
  adminUpdateGroup,
} from "../../controllers/admin/adminGroup.controller.js";

const router = express.Router();

router.use(authGuard, isAdmin);

// group posts
router.post("/createGroup", authGuard, isAdmin, adminCreateGroup);
router.get("/my-groups", authGuard, isAdmin, adminGetMyYourGroups);
router.get("/:groupId/details", authGuard, isAdmin, adminGetGroupDetails);

router.get("/Allgroups", adminGetAllGroups);
router.patch("/groups/:groupId", adminUpdateGroup);
router.patch("/groups/:groupId/soft", adminSoftDeleteGroup); // soft delete
router.patch("/groups/:groupId/restore", adminRestoreGroup);
router.delete("/groups/:groupId/hard", adminHardDeleteGroup);

export default router;
