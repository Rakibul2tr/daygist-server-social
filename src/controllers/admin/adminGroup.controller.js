import mongoose from "mongoose";

import Group from "../../models/group/group.model.js";
import GroupMember from "../../models/group/groupMember.model.js";
import {
  normalizeRules,
  slugify,
  validateCreateGroupBody,
} from "../../models/group/group.validation.js";

/* ============================================================================
  ADMIN GROUP CONTROLLER
  Put this file: controllers/group/adminGroup.controller.js

  NOTE:
  - Apply auth + admin middleware in routes (protect + requireAdmin)
============================================================================ */

const makeUniqueSlug = async (base) => {
  let slug = base || `group-${Date.now()}`;
  let i = 0;

  while (await Group.exists({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
    if (i > 20) slug = `${base}-${Date.now()}`;
  }
  return slug;
};

// cursor helper
const parseCursor = (raw) => {
  try {
    if (!raw) return null;
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
};

const createdCursorFilter = (cursor) => {
  if (!cursor?.createdAt || !cursor?._id) return {};
  return {
    $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      {
        createdAt: new Date(cursor.createdAt),
        _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
      },
    ],
  };
};

const joinedCursorFilter = (cursor) => {
  if (!cursor?.createdAt || !cursor?._id) return {};
  return {
    $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      {
        createdAt: new Date(cursor.createdAt),
        _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
      },
    ],
  };
};

/**
 * POST /admin/groups
 * Admin create group
 */
export const adminCreateGroup = async (req, res) => {
  const me = req.user?._id;
  if (!me) return res.status(401).json({ message: "Unauthorized" });

  const check = validateCreateGroupBody(req.body);
  if (!check.ok) return res.status(400).json({ message: check.message });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const name = String(req.body.name).trim();
    const privacy = String(req.body.privacy).trim();

    const about = String(req.body?.about || "").trim();
    const coverUrl = req.body?.coverUrl
      ? {
          key: String(req.body.coverUrl.key || ""),
          url: String(req.body.coverUrl?.url || ""),
          provider: String(req.body.coverUrl?.provider || ""),
        }
      : undefined;

    const category = String(req.body?.category || "").trim();
    const location = {
      country: String(req.body?.location?.country || "").trim(),
      city: String(req.body?.location?.city || "").trim(),
    };

    const rules = normalizeRules(req.body?.rules);

    const approval = {
      memberApprovalRequired:
        typeof req.body?.approval?.memberApprovalRequired === "boolean"
          ? req.body.approval.memberApprovalRequired
          : privacy === "private",
      postApprovalRequired:
        typeof req.body?.approval?.postApprovalRequired === "boolean"
          ? req.body.approval.postApprovalRequired
          : false,
    };

    const baseSlug = slugify(name);
    const slug = await makeUniqueSlug(baseSlug);

    const group = await Group.create(
      [
        {
          name,
          slug,
          privacy,
          coverUrl,
          about,
          category,
          location,
          rules,
          approval,
          counts: { members: 1, posts: 0 },
          createdBy: me,
        },
      ],
      { session },
    );

    // ✅ creator is admin & active member
    await GroupMember.create(
      [
        {
          groupId: group[0]._id,
          userId: me,
          role: "admin",
          status: "active",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Group created",
      data: group[0],
    });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json({ message: e?.message || "Create group failed" });
  }
};

/**
 * GET /admin/groups/:groupId/details
 * Admin group details (with myMembership)
 */
export const adminGetGroupDetails = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const groupId = String(req.params.groupId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const gid = new mongoose.Types.ObjectId(groupId);

    // ✅ group fetch
    const group = await Group.findOne({
      _id: gid,
      isDeleted: { $ne: true },
    })
      .select(
        "_id name slug privacy coverUrl about category location counts createdAt updatedAt createdBy",
      )
      .lean();

    if (!group) return res.status(404).json({ message: "Group not found" });

    // ✅ my membership (role/status)
    const myMembership = await GroupMember.findOne({
      groupId: gid,
      userId: new mongoose.Types.ObjectId(me),
    })
      .select("_id status role createdAt")
      .lean();

    const counts = group.counts || {};

    return res.json({
      success: true,
      group: {
        _id: group._id,
        name: group.name,
        slug: group.slug,
        privacy: group.privacy,
        coverUrl: group.coverUrl,
        about: group.about,
        category: group.category,
        location: group.location,
        counts: {
          members: Number(counts.members || 0),
          posts: Number(counts.posts || 0),
        },
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        createdBy: group.createdBy,

        // UI helpful
        isCreatedByMe: String(group.createdBy) === String(me),
        myMembership: myMembership
          ? {
              _id: myMembership._id,
              status: myMembership.status,
              role: myMembership.role,
              joinedAt: myMembership.createdAt,
            }
          : null,
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch group details failed" });
  }
};

/**
 * GET /admin/groups/my-groups?limit=20&cursor={}
 * ✅ Created groups first, then joined groups list (single array)
 * Optional: status=active/requested (for joined)
 */
export const adminGetMyYourGroups = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);

    const status = String(req.query.status || "").trim();
    const statusFilter =
      status === "active" || status === "requested"
        ? { status }
        : { status: { $in: ["active", "requested"] } };

    const cursor = parseCursor(req.query.cursor);

    // section: 0 => created, 1 => joined
    const startSection = cursor?.section === 1 ? 1 : 0;

    const out = [];
    const meOid = new mongoose.Types.ObjectId(me);

    /* ---------------------------
     * 1) CREATED FIRST
     * -------------------------- */
    if (startSection === 0) {
      const createdRows = await Group.aggregate([
        {
          $match: {
            createdBy: meOid,
            isDeleted: { $ne: true },
            ...(cursor?.section === 0 ? createdCursorFilter(cursor) : {}),
          },
        },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: take },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            privacy: 1,
            coverUrl: 1,
            about: 1,
            category: 1,
            location: 1,
            counts: 1,
            createdBy: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      for (const g of createdRows) {
        out.push({
          section: 0,
          status: "active",
          role: "owner",
          membershipId: null,
          createdAt: g.createdAt,
          _id: g._id,
          group: g,
        });
      }

      // fill remaining with joined
      const remaining = take - out.length;
      if (remaining > 0) {
        const joinedRows = await GroupMember.aggregate([
          {
            $match: {
              userId: meOid,
              ...statusFilter,
            },
          },
          { $sort: { createdAt: -1, _id: -1 } },
          { $limit: remaining },

          {
            $lookup: {
              from: "groups",
              localField: "groupId",
              foreignField: "_id",
              as: "group",
            },
          },
          { $unwind: "$group" },
          { $match: { "group.isDeleted": { $ne: true } } },

          // exclude my created groups so no duplicate
          { $match: { "group.createdBy": { $ne: meOid } } },

          {
            $project: {
              _id: 1,
              createdAt: 1,
              status: 1,
              role: 1,
              groupId: 1,
              group: {
                _id: "$group._id",
                name: "$group.name",
                slug: "$group.slug",
                privacy: "$group.privacy",
                coverUrl: "$group.coverUrl",
                about: "$group.about",
                category: "$group.category",
                location: "$group.location",
                counts: "$group.counts",
                createdBy: "$group.createdBy",
                createdAt: "$group.createdAt",
                updatedAt: "$group.updatedAt",
              },
            },
          },
        ]);

        for (const m of joinedRows) {
          out.push({
            section: 1,
            status: m.status,
            role: m.role,
            membershipId: m._id,
            createdAt: m.createdAt,
            _id: m._id,
            group: m.group,
          });
        }
      }
    }

    /* ---------------------------
     * 2) JOINED ONLY
     * -------------------------- */
    if (startSection === 1) {
      const joinedRows = await GroupMember.aggregate([
        {
          $match: {
            userId: meOid,
            ...statusFilter,
            ...(cursor?.section === 1 ? joinedCursorFilter(cursor) : {}),
          },
        },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: take },

        {
          $lookup: {
            from: "groups",
            localField: "groupId",
            foreignField: "_id",
            as: "group",
          },
        },
        { $unwind: "$group" },
        { $match: { "group.isDeleted": { $ne: true } } },
        { $match: { "group.createdBy": { $ne: meOid } } },

        {
          $project: {
            _id: 1,
            createdAt: 1,
            status: 1,
            role: 1,
            groupId: 1,
            group: {
              _id: "$group._id",
              name: "$group.name",
              slug: "$group.slug",
              privacy: "$group.privacy",
              coverUrl: "$group.coverUrl",
              about: "$group.about",
              category: "$group.category",
              location: "$group.location",
              counts: "$group.counts",
              createdBy: "$group.createdBy",
              createdAt: "$group.createdAt",
              updatedAt: "$group.updatedAt",
            },
          },
        },
      ]);

      for (const m of joinedRows) {
        out.push({
          section: 1,
          status: m.status,
          role: m.role,
          membershipId: m._id,
          createdAt: m.createdAt,
          _id: m._id,
          group: m.group,
        });
      }
    }

    const last = out[out.length - 1];
    const nextCursor = last
      ? {
          section: last.section,
          createdAt: last.createdAt,
          _id: String(last._id),
        }
      : null;

    return res.json({ success: true, items: out, nextCursor });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch your groups failed" });
  }
};



export const adminGetAllGroups = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const items = await Group.find({})
      .populate("createdBy", "name username email avatar") // ✅ সব group
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, items });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Fetch groups failed" });
  }
};

/**
 * ✅ PATCH /admin/groups/:groupId
 * Admin: update group (safe fields only)
 */
export const adminUpdateGroup = async (req, res) => {
  try {
    const groupId = String(req.params.groupId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const allow = [
      "name",
      "privacy",
      "about",
      "coverUrl",
      "category",
      "location",
      "rules",
      "approval",
    ];

    const body = req.body || {};
    const update = {};

    for (const k of allow) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    if (update.name != null) update.name = String(update.name).trim();
    if (update.about != null) update.about = String(update.about).trim();
    if (update.category != null) update.category = String(update.category).trim();

    const saved = await Group.findByIdAndUpdate(
      groupId,
      { $set: update },
      { new: true }
    ).lean();

    if (!saved) return res.status(404).json({ message: "Group not found" });

    return res.json({ success: true, message: "Group updated", item: saved });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Update group failed" });
  }
};

/**
 * ✅ DELETE /admin/groups/:groupId
 * Admin: soft delete group
 */
export const adminSoftDeleteGroup = async (req, res) => {
  try {
    const groupId = String(req.params.groupId || "").trim();
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const saved = await Group.findByIdAndUpdate(
      groupId,
      { $set: { isDeleted: true } },
      { new: true }
    ).lean();

    if (!saved) return res.status(404).json({ message: "Group not found" });

    return res.json({ success: true, message: "Group deleted", item: saved });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Delete group failed" });
  }
};


/**
 * ✅ PATCH /admin/groups/:groupId/restore
 * Admin: restore deleted group
 */
export const adminRestoreGroup = async (req, res) => {
  try {
    const groupId = String(req.params.groupId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const saved = await Group.findByIdAndUpdate(
      groupId,
      { $set: { isDeleted: false } },
      { new: true }
    ).lean();

    if (!saved) return res.status(404).json({ message: "Group not found" });

    return res.json({ success: true, message: "Group restored", item: saved });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Restore group failed" });
  }
};

/**
 * ❌ DELETE /admin/groups/:groupId/hard
 * Admin: permanently delete group (HARD DELETE)
 */
export const adminHardDeleteGroup = async (req, res) => {
  try {
    const groupId = String(req.params.groupId || "").trim();

    // 🔍 validate objectId
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    // ❌ PERMANENT DELETE
    const deleted = await Group.findByIdAndDelete(groupId).lean();

    if (!deleted) {
      return res.status(404).json({ message: "Group not found" });
    }

    return res.json({
      success: true,
      message: "Group permanently deleted",
      item: deleted,
    });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Hard delete group failed",
    });
  }
};
