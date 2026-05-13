// FILE: src/routes/admin/adminUser.routes.js
import express from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { isAdmin } from "../../middleware/isAdminMiddleware.js";

import {
  adminGetAllUsers,
  adminGetUserById,
  
  googleAdminLoginOrCreate,
  adminUpdateUserControls,
  adminOverview,
  getUsersByRole,
} from "../../controllers/admin/adminUser.controller.js";

const router = express.Router();

//admin login
router.post("/google-admin-login", googleAdminLoginOrCreate);

// list + details
router.get("/users", authGuard, isAdmin, adminGetAllUsers);
router.get("/users/:id", authGuard, isAdmin, adminGetUserById);

// all status update 1 api
router.patch(
  "/users/:id/update-controls",
  authGuard,
  isAdmin,
  adminUpdateUserControls,
);

router.get("/overview-info", authGuard, isAdmin, adminOverview);
// role based user fetching
router.get("/users-by-role", authGuard, isAdmin, getUsersByRole);

// // block / unblock
// router.patch("/users/:id/block", authGuard, isAdmin, adminSetUserBlocked);

// // verify
// router.patch("/users/:id/verify", authGuard, isAdmin, adminSetUserVerified);

// // delete/restore
// router.delete("/users/:id", authGuard, isAdmin, adminDeleteUser);
// router.patch("/users/:id/restore", authGuard, isAdmin, adminRestoreUser);

// // force logout
// router.patch("/users/:id/force-logout", authGuard, isAdmin, adminForceLogoutUser);

export default router;
