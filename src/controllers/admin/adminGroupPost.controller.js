import mongoose from "mongoose";
import {
  mustBeActiveMember,
  canManageGroupPost,
  parseCursor,
  buildCursorFilter,
} from "../../helpers/groupPostHelper.js";

import  GroupPost  from "../../models/group/groupPost.model.js";


/* ============================================================================
  ADMIN GROUP POSTS CONTROLLER
  Keep this file: controllers/group/adminGroup.controller.js

  NOTE:
  - Use admin auth middleware in routes
  - Still checks membership + permission rules for safety
============================================================================ */

/**
 * POST /admin/groups/:groupId/posts
 * Create group post (author = logged in admin user) - BUT still requires membership.
 */
export const adminCreateGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId } = req.params;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid groupId" });
    }

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const body = req.body || {};
    const type = String(body.type || "").trim();

    if (!["text", "image", "video"].includes(type)) {
      return res.status(400).json({ message: "Invalid post type" });
    }

    // ✅ validations
    if (type === "text" && !String(body.text || "").trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    if (
      type === "image" &&
      (!Array.isArray(body.images) || body.images.length === 0) &&
      !String(body.caption || "").trim()
    ) {
      return res.status(400).json({ message: "Image or caption required" });
    }

    if (
      type === "video" &&
      !body?.video?.url &&
      !String(body.caption || "").trim()
    ) {
      return res.status(400).json({ message: "Video url or caption required" });
    }

    const doc = await GroupPost.create({
      groupId: new mongoose.Types.ObjectId(groupId),
      authorId: new mongoose.Types.ObjectId(me),
      ...body,
      isDeleted: false,
    });

    return res.json({ success: true, item: doc });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Create group post failed",
    });
  }
};

/**
 * GET /admin/groups/:groupId/posts?limit=20&cursor={}
 * Get particular group's posts (requires membership)
 */
export const adminGetGroupPosts = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId } = req.params;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid groupId" });
    }

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const rows = await GroupPost.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      isDeleted: { $ne: true },
      ...cursorFilter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(take)
      .populate("authorId", "name avatarUrl avatarKey")
      .lean();

    const nextCursor =
      rows.length > 0
        ? {
            createdAt: rows[rows.length - 1].createdAt,
            _id: rows[rows.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items: rows, nextCursor });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Fetch group posts failed",
    });
  }
};


/**
 * GET /admin/groups/:groupId/posts/:postId
 */
export const adminGetSingleGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId, postId } = req.params;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (
      !mongoose.Types.ObjectId.isValid(groupId) ||
      !mongoose.Types.ObjectId.isValid(postId)
    ) {
      return res.status(400).json({ message: "Invalid params" });
    }

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const post = await GroupPost.findOne({
      _id: new mongoose.Types.ObjectId(postId),
      groupId: new mongoose.Types.ObjectId(groupId),
      isDeleted: { $ne: true },
    })
      .populate("authorId", "name avatarUrl avatarKey")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    return res.json({ success: true, item: post });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Fetch group post failed",
    });
  }
};

/**
 * PATCH /admin/groups/:groupId/posts/:postId
 * ✅ only author OR admin/moderator/owner (by helper)
 */
export const adminUpdateGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId, postId } = req.params;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    if (
      !mongoose.Types.ObjectId.isValid(groupId) ||
      !mongoose.Types.ObjectId.isValid(postId)
    ) {
      return res.status(400).json({ message: "Invalid params" });
    }

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const post = await GroupPost.findOne({
      _id: new mongoose.Types.ObjectId(postId),
      groupId: new mongoose.Types.ObjectId(groupId),
      isDeleted: { $ne: true },
    });

    if (!post) return res.status(404).json({ message: "Post not found" });

    const perm = await canManageGroupPost({ me, groupId, post });
    if (!perm.ok) return res.status(perm.code).json({ message: perm.message });

    const body = req.body || {};
    const update = {};

    // ✅ allow only these fields to update
    const allow = [
      "text",
      "caption",
      "backgroundUrl",
      "textStyle",
      "images",
      "layout",
      "video",
      "mutedByDefault",
      "loop",
      "category",
      "subCategory",
    ];

    for (const k of allow) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    update.editedAt = new Date();

    const saved = await GroupPost.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(postId),
        groupId: new mongoose.Types.ObjectId(groupId),
      },
      { $set: update },
      { new: true },
    )
      .populate("authorId", "name avatarUrl avatarKey")
      .lean();

    return res.json({ success: true, item: saved });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Update group post failed",
    });
  }
};

/**
 * DELETE /admin/groups/:groupId/posts/:postId
 * ✅ soft delete
 */
export const adminDeleteGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId, postId } = req.params;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (
      !mongoose.Types.ObjectId.isValid(groupId) ||
      !mongoose.Types.ObjectId.isValid(postId)
    ) {
      return res.status(400).json({ message: "Invalid params" });
    }

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const post = await GroupPost.findOne({
      _id: new mongoose.Types.ObjectId(postId),
      groupId: new mongoose.Types.ObjectId(groupId),
      isDeleted: { $ne: true },
    });

    if (!post) return res.status(404).json({ message: "Post not found" });

    const perm = await canManageGroupPost({ me, groupId, post });
    if (!perm.ok) return res.status(perm.code).json({ message: perm.message });

    await GroupPost.updateOne(
      {
        _id: new mongoose.Types.ObjectId(postId),
        groupId: new mongoose.Types.ObjectId(groupId),
      },
      { $set: { isDeleted: true, deletedAt: new Date() } },
    );

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({
      message: e?.message || "Delete group post failed",
    });
  }
};


/**
 * ✅ GET /admin/group-posts?limit=50&cursor=...
 * Admin: list all group posts (newest first)
 * optional filters:
 *  - groupId=...
 *  - authorId=...
 *  - type=text|image|video
 *  - q=search caption/text (optional basic search)
 */
export const adminGetAllGroupPosts = async (req, res) => {
  try {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const groupId = String(req.query.groupId || "").trim();
    const authorId = String(req.query.authorId || "").trim();
    const type = String(req.query.type || "").trim(); // text|image|video
    const q = String(req.query.q || "").trim();

    const match = {
      isDeleted: { $ne: true },
      ...cursorFilter,
    };

    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      match.groupId = new mongoose.Types.ObjectId(groupId);
    }
    if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
      match.authorId = new mongoose.Types.ObjectId(authorId);
    }
    if (type && ["text", "image", "video"].includes(type)) {
      match.type = type;
    }

    // ✅ simple text search (caption/text) — optional
    if (q) {
      match.$or = [
        { caption: { $regex: q, $options: "i" } },
        { text: { $regex: q, $options: "i" } },
      ];
    }

    const rows = await GroupPost.find(match)
      .sort({ createdAt: -1, _id: -1 })
      .limit(take)
      .populate("authorId", "name avatarUrl avatarKey") // ✅ author
      .populate("groupId", "name privacy coverUrl counts") // ✅ group
      .lean();

    // ✅ client-friendly shape (author + group)
    const items = (rows || []).map((p) => ({
      ...p,
      author: p?.authorId
        ? {
            _id: p.authorId?._id,
            name: p.authorId?.name,
            avatarUrl: p.authorId?.avatarUrl,
            avatarKey: p.authorId?.avatarKey,
          }
        : null,
      group: p?.groupId
        ? {
            _id: p.groupId?._id,
            name: p.groupId?.name,
            privacy: p.groupId?.privacy,
            coverUrl: p.groupId?.coverUrl,
            counts: p.groupId?.counts,
          }
        : null,
    }));

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items, nextCursor });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch group posts failed" });
  }
};