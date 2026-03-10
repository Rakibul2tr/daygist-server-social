// src/modules/groups/group.routes.js
import { Router } from "express";
import { authGuard } from "../../middleware/authMiddleware.js";
import { createGroup, getForYouGroups, getGroupDetails, getGroupJoinRequests, getGroupMembers, getMyYourGroups, joinGroup, updateGroupMemberStatus } from "../../controllers/group/group.controller.js";


const router = Router();

// ✅ create
router.post("/create", authGuard, createGroup);
router.post("/:id/join", authGuard, joinGroup);
router.get("/my", authGuard, getMyYourGroups);
router.get("/for-you", authGuard, getForYouGroups);
router.get("/:groupId/join-requests", authGuard, getGroupJoinRequests);
router.get("/:groupId/members", authGuard, getGroupMembers);
router.patch(
  "/:groupId/members/:memberId/status",authGuard,updateGroupMemberStatus,
);


// group detail
router.get("/:groupId/group-details", authGuard, getGroupDetails);




export default router;
