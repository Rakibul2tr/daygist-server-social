// FILE: src/routes/admin/adminUser.routes.js
import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

import {
  adminGetAllUsers,
  adminGetUserById,
  adminSetUserRole,
  adminSetUserBlocked,
  adminSetUserVerified,
  adminDeleteUser,
  adminRestoreUser,
  adminForceLogoutUser,
} from "../../controllers/admin/adminUser.controller.js";

const router = express.Router();

// list + details
router.get("/users", authGuard, isAdmin, adminGetAllUsers);
router.get("/users/:id", authGuard, isAdmin, adminGetUserById);

// role
router.patch("/users/:id/role", authGuard, isAdmin, adminSetUserRole);

// block / unblock
router.patch("/users/:id/block", authGuard, isAdmin, adminSetUserBlocked);

// verify
router.patch("/users/:id/verify", authGuard, isAdmin, adminSetUserVerified);

// delete/restore
router.delete("/users/:id", authGuard, isAdmin, adminDeleteUser);
router.patch("/users/:id/restore", authGuard, isAdmin, adminRestoreUser);

// force logout
router.patch("/users/:id/force-logout", authGuard, isAdmin, adminForceLogoutUser);

export default router;
