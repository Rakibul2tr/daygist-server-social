import mongoose from "mongoose";
import {
  mustBeActiveMember,
  canManageGroupPost,
  parseCursor,
  buildCursorFilter,
} from "../../helpers/groupPostHelper.js";
import GroupPost  from "../../models/group/groupPost.model.js";
import GroupMember from "../../models/group/groupMember.model.js";
import Group from "../../models/group/group.model.js";

/**
 * POST /groups/:groupId/posts
 */
export const createGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId } = req.params;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const body = req.body || {};
    const type = String(body.type || "").trim();

    if (!["text", "image", "video"].includes(type)) {
      return res.status(400).json({ message: "Invalid post type" });
    }

    // ✅ basic validations
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
    return res
      .status(500)
      .json({ message: e?.message || "Create group post failed" });
  }
};

/**
 * GET /groups/:groupId/posts?limit=20&cursor={} particular group
 */
export const getGroupPosts = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId } = req.params;

    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const rows = await GroupPost.find({
      groupId,
      isDeleted: { $ne: true },
      ...cursorFilter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(take)
      // ✅ author populate
      .populate("authorId", "name avatar")
      // ✅ group populate (adjust fields তোমার Group model অনুযায়ী)
      .populate("groupId", "name privacy coverUrl counts")
      .lean();

    // ✅ UI friendly shape (GroupPostCard expects item.author + item.group)
    const items = (rows || []).map((p) => {
      // console.log('p',p);
      
      const author = p?.authorId
        ? {
            _id: p.authorId?._id,
            name: p.authorId?.name,
            avatar: p.authorId?.avatar,
          }
        : null;

      const group = p?.groupId
        ? {
            _id: p.groupId?._id,
            name: p.groupId?.name,
            privacy: p.groupId?.privacy,
            coverUrl: p.groupId?.coverUrl, // should be {url,key,provider}
            counts: p.groupId?.counts,
          }
        : null;

      return {
        ...p,
        author,
        group,
      };
    });

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




// ✅ GET /groups posts my group and joined group ( member ship)
export const getMyGroupsPost = async (req, res) => {
  try {
    const me = req.user?._id;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const take = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const groupIdParam = String(req.query.groupId || "").trim();
    const groupIdFilter =
      groupIdParam && mongoose.Types.ObjectId.isValid(groupIdParam)
        ? new mongoose.Types.ObjectId(groupIdParam)
        : null;

    const meObjId = new mongoose.Types.ObjectId(me);

    // ✅ 1) find my accessible group ids:
    // - groups where I'm active/requested member (you can keep only 'active' if you want)
    // - groups I created (fallback if membership doc missing)
    const [memberGroupIds, createdGroupIds] = await Promise.all([
      GroupMember.distinct("groupId", {
        userId: meObjId,
        status: { $in: ["active"] }, // posts tab এ requested না চাইলে শুধু active রাখো
      }),
      Group.distinct("_id", {
        createdBy: meObjId,
        isDeleted: { $ne: true },
      }),
    ]);

    const allowedSet = new Set(
      [...memberGroupIds, ...createdGroupIds].map((x) => String(x))
    );

    // ✅ optional single group filter
    if (groupIdFilter) {
      if (!allowedSet.has(String(groupIdFilter))) {
        return res.json({ success: true, items: [], nextCursor: null });
      }
    }

    const allowedIds = groupIdFilter
      ? [groupIdFilter]
      : Array.from(allowedSet).map((id) => new mongoose.Types.ObjectId(id));

    if (!allowedIds.length) {
      return res.json({ success: true, items: [], nextCursor: null });
    }

    // ✅ 2) fetch posts from GroupPost across these groups
    const rows = await GroupPost.aggregate([
      {
        $match: {
          groupId: { $in: allowedIds },
          isDeleted: { $ne: true },
          ...cursorFilter,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: take },

      // group join
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

      // author join (your post has authorId)
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },

      // ✅ final shape (client friendly)
      {
        $project: {
          _id: 1,
          groupId: 1,
          type: 1,
          text: 1,
          caption: 1,
          backgroundUrl: 1,
          textStyle: 1,

          images: 1, // [{url,key,provider,type:'image'?}] - keep as-is
          video: 1,  // {url,key,provider,thumbnailUrl}

          layout: 1,
          mutedByDefault: 1,
          loop: 1,
          category: 1,
          subCategory: 1,

          counts: 1,
          createdAt: 1,
          updatedAt: 1,

          group: {
            _id: "$group._id",
            name: "$group.name",
            privacy: "$group.privacy",
            coverUrl: "$group.coverUrl",
            counts: "$group.counts",
          },

          author: {
            _id: "$author._id",
            name: "$author.name",
            avatarUrl: "$author.avatarUrl",
            avatarKey: "$author.avatarKey",
          },
        },
      },
    ]);

    const nextCursor =
      rows.length > 0
        ? {
            createdAt: rows[rows.length - 1].createdAt,
            _id: rows[rows.length - 1]._id,
          }
        : null;

    return res.json({ success: true, items: rows, nextCursor });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch groups feed failed" });
  }
};

/**
 * GET /groups/:groupId/posts/:postId
 */
export const getSingleGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId, postId } = req.params;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const post = await GroupPost.findOne({
      _id: postId,
      groupId,
      isDeleted: { $ne: true },
    })
      .populate("authorId", "name avatarUrl")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    return res.json({ success: true, item: post });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch group post failed" });
  }
};

/**
 * PATCH /groups/:groupId/posts/:postId
 * ✅ only author OR admin/moderator/owner
 */
export const updateGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId, postId } = req.params;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    // must be member
    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const post = await GroupPost.findOne({
      _id: postId,
      groupId,
      isDeleted: { $ne: true },
    });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const perm = await canManageGroupPost({ me, groupId, post });
    if (!perm.ok) return res.status(perm.code).json({ message: perm.message });

    // ✅ allowed fields only
    const body = req.body || {};
    const update = {};

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
      { _id: postId, groupId },
      { $set: update },
      { new: true },
    ).populate("authorId", "name avatarUrl");

    return res.json({ success: true, item: saved });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Update group post failed" });
  }
};

/**
 * DELETE /groups/:groupId/posts/:postId
 * ✅ soft delete (recommended)
 */
export const deleteGroupPost = async (req, res) => {
  try {
    const me = req.user?._id;
    const { groupId, postId } = req.params;
    if (!me) return res.status(401).json({ message: "Unauthorized" });

    const okMem = await mustBeActiveMember({ me, groupId });
    if (!okMem.ok)
      return res.status(okMem.code).json({ message: okMem.message });

    const post = await GroupPost.findOne({
      _id: postId,
      groupId,
      isDeleted: { $ne: true },
    });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const perm = await canManageGroupPost({ me, groupId, post });
    if (!perm.ok) return res.status(perm.code).json({ message: perm.message });

    await GroupPost.updateOne(
      { _id: postId, groupId },
      { $set: { isDeleted: true } },
    );

    return res.json({ success: true });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Delete group post failed" });
  }
};
