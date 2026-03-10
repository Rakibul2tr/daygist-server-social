import mongoose from "mongoose";
import Group from "../models/group/group.model.js";
import GroupMember from "../models/group/groupMember.model.js";


export const parseCursor = (cursorRaw) => {
  if (!cursorRaw) return null;
  try {
    const c = typeof cursorRaw === "string" ? JSON.parse(cursorRaw) : cursorRaw;
    if (!c?.createdAt || !c?._id) return null;
    return { createdAt: new Date(c.createdAt), _id: c._id };
  } catch {
    return null;
  }
};

export const buildCursorFilter = (cursor) => {
  if (!cursor) return {};
  return {
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      {
        createdAt: cursor.createdAt,
        _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
      },
    ],
  };
};

export const mustBeActiveMember = async ({ me, groupId }) => {
  const group = await Group.findOne({ _id: groupId, isDeleted: { $ne: true } });
  if (!group) return { ok: false, code: 404, message: "Group not found" };

  const member = await GroupMember.findOne({
    groupId,
    userId: me,
    status: "active",
  });

  if (!member) return { ok: false, code: 403, message: "Not a group member" };

  return { ok: true, group, member };
};

export const canManageGroupPost = async ({ me, groupId, post }) => {
  // ✅ author can manage
  if (String(post.authorId) === String(me)) return { ok: true };

  // ✅ group admin/owner/moderator can manage
  const member = await GroupMember.findOne({
    groupId,
    userId: me,
    status: "active",
  });

  const role = String(member?.role || "");
  const allowed = ["owner", "admin", "moderator"].includes(role);

  return allowed
    ? { ok: true }
    : { ok: false, code: 403, message: "No permission" };
};


/* --------------------------- permission helper --------------------------- */
export const canManageMembers = async ({ me, groupId }) => {
  const gid = new mongoose.Types.ObjectId(groupId);
  const meId = new mongoose.Types.ObjectId(me);

  const [group, myMem] = await Promise.all([
    Group.findOne({ _id: gid, isDeleted: { $ne: true } })
      .select("_id createdBy creatorId")
      .lean(),
    GroupMember.findOne({
      groupId: gid,
      userId: meId,
      status: "active",
    })
      .select("_id role status")
      .lean(),
  ]);

  if (!group) return { ok: false, code: 404, message: "Group not found" };

  // ✅ owner (createdBy) OR active admin/moderator
  const ownerId = group.createdBy || group.creatorId; // তোমার code এ ২টাই দেখা গেছে
  const isOwner = ownerId ? String(ownerId) === String(me) : false;

  const role = myMem?.role;
  const isAdmin =
    role === "admin" || role === "moderator" || role === "owner";

  if (!isOwner && !isAdmin) {
    return { ok: false, code: 403, message: "Not allowed" };
  }

  return { ok: true, group, myMem };
};