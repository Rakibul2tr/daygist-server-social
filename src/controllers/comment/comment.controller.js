// controllers/comment/comment.controller.js
import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import GroupPost from "../../models/group/groupPost.model.js";
import Comment from "../../models/comment/comment.model.js";
import Notification from "../../models/notification/notification.model.js";
import { sendPushToUser } from "../../services/push/sendPushToUser.js"; // adjust path
import CommentReaction from "../../models/comment/commentReeaction.model.js";
import Ad from "../../models/ads/ad.model.js"; 

/* ------------------------- cursor helpers ------------------------- */
const parseCursor = (raw) => {
  try {
    if (!raw) return null;
    const obj =
      typeof raw === "string" ? JSON.parse(decodeURIComponent(raw)) : raw;
    if (!obj?.createdAt || !obj?._id) return null;
    return obj;
  } catch {
    return null;
  }
};

const buildCursorFilter = (cursor) => {
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

const isValidType = (t) => t === "post" || t === "groupPost"|| "ad";

/* ===================================================================
   ✅ CREATE COMMENT (post + groupPost)
   Route: POST /comments/:postId
   Body: { type:"post"|"groupPost", text, parentId? }
=================================================================== */

// export const createComment = async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ ok: false, message: "Unauthorized" });
//     }

//     const postId = String(req.params?.postId || "");
//     const text = String(req.body?.text || "").trim();
//     const parentId = req.body?.parentId || null;
//     const type = String(req.body?.type || "post"); // "post" | "groupPost"

//     if (!mongoose.isValidObjectId(postId)) {
//       return res.status(400).json({ ok: false, message: "Invalid post id" });
//     }

//     if (parentId && !mongoose.isValidObjectId(parentId)) {
//       return res.status(400).json({ ok: false, message: "Invalid parent id" });
//     }

//     if (!isValidType(type)) {
//       return res.status(400).json({ ok: false, message: "Invalid type" });
//     }

//     if (!text) {
//       return res.status(400).json({ ok: false, message: "Comment required" });
//     }

//     let postOwnerId = null;
//     let parentCommentOwnerId = null;
//     const isReply = !!parentId;
//     let createdId = null;

//     await session.withTransaction(async () => {

//       // ✅ target post/group post check
//      if (type === "post") {
//         const post = await Post.findOne({
//           _id: postId,
//           isDeleted: false,
//         }).session(session);

//         if (!post) throw new Error("Post not found");
//         postOwnerId = post.author;

//         // ✅ only top-level comment increments post commentCount
//         await Post.updateOne(
//           { _id: postId },
//           { $inc: { commentCount: 1 } },
//           { session },
//         );
//       } else {
//         const gp = await GroupPost.findOne({
//           _id: postId,
//           isDeleted: { $ne: true },
//         }).session(session);

//         if (!gp) throw new Error("Post not found");
//         postOwnerId = gp.authorId;

//         // ✅ only top-level comment increments group post commentCount
//         await GroupPost.updateOne(
//           { _id: postId },
//           { $inc: { "counts.commentCount": 1 } },
//           { session },
//         );
//       }

//       // ✅ parent validation for reply
//       if (isReply) {
//         const parent = await Comment.findOne({
//           _id: parentId,
//           targetType: type,
//           postId,
//           isDeleted: false,
//         }).session(session);

//         if (!parent) throw new Error("Parent comment not found");

//         parentCommentOwnerId = parent.author;

//         await Comment.updateOne(
//           { _id: parentId },
//           { $inc: { replyCount: 1 } },
//           { session },
//         );
//       }

//       const created = await Comment.create(
//         [
//           {
//             targetType: type,
//             postId,
//             author: userId,
//             parentId: parentId || null,
//             text,
//           },
//         ],
//         { session },
//       );

//       createdId = created?.[0]?._id;
//     };);

//     const comment = await Comment.findById(createdId)
//       .populate("author", "name username profilePic uid")
//       .lean();

//     const meName = req.user?.name || req.user?.username || "Someone";

//     const payload =
//       type === "post"
//         ? { postId: String(postId), commentId: String(comment?._id) }
//         : { groupPostId: String(postId), commentId: String(comment?._id) };

//     if (isReply) {
//       const to = parentCommentOwnerId ? String(parentCommentOwnerId) : null;

//       if (to && to !== String(userId)) {
//         const n = await Notification.create({
//           toUserId: to,
//           fromUserId: userId,
//           type: type === "post" ? "comment_reply" : "group_comment_reply",
//           title: "New reply",
//           body: `${meName} replied to your comment`,
//           data: payload,
//         });

//         sendPushToUser(to, {
//           title: n.title,
//           body: n.body,
//           data: { notificationId: String(n._id), ...n.data },
//         }).catch(() => {});
//       }
//     } else {
//       const to = postOwnerId ? String(postOwnerId) : null;

//       if (to && to !== String(userId)) {
//         const n = await Notification.create({
//           toUserId: to,
//           fromUserId: userId,
//           type: type === "post" ? "post_comment" : "group_post_comment",
//           title: "New comment",
//           body: `${meName} commented on your post`,
//           data: payload,
//         });

//         sendPushToUser(to, {
//           title: n.title,
//           body: n.body,
//           data: { notificationId: String(n._id), ...n.data },
//         }).catch(() => {});
//       }
//     }

//     return res.json({ ok: true, comment });
//   } catch (e) {
//     const msg = e?.message || "Comment failed";

//     const status =
//       msg === "Post not found"
//         ? 404
//         : msg === "Parent comment not found"
//           ? 404
//           : 500;

//     return res.status(status).json({ ok: false, message: msg });
//   } finally {
//     session.endSession();
//   }
// };

export const createComment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const postId = String(req.params?.postId || "");
    const text = String(req.body?.text || "").trim();
    const parentId = req.body?.parentId || null;
    const type = String(req.body?.type || "post"); // "post" | "groupPost" | "ad" 🌟

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ ok: false, message: "Invalid post id" });
    }

    if (parentId && !mongoose.isValidObjectId(parentId)) {
      return res.status(400).json({ ok: false, message: "Invalid parent id" });
    }

  
    if (!text) {
      return res.status(400).json({ ok: false, message: "Comment required" });
    }

    let postOwnerId = null;
    let parentCommentOwnerId = null;
    const isReply = !!parentId;
    let createdId = null;

    await session.withTransaction(async () => {
      // ==========================================
      // 🌟 🌟 ২. AD CAMPAIGN CHECK & COUNTER UPDATE
      // ==========================================
      if (type === "ad") {
        const adCampaign = await Ad.findOne({
          _id: postId,
          status: "active", // শুধুমাত্র লাইভ বিজ্ঞাপনেই কমেন্ট করা যাবে
        }).session(session);

        if (!adCampaign) throw new Error("Ad campaign not found");
        postOwnerId = adCampaign.advertiserId; // বিজ্ঞাপনদাতার আইডি লক করা হলো

        // বিজ্ঞপ্তির মেইন টেবিলে commentCount ১ বাড়ানো হলো
        await Ad.updateOne(
          { _id: postId },
          { $inc: { commentCount: 1 } },
          { session },
        );
      }
      // ✅ NORMAL POST (আপনার আগের কোড)
      else if (type === "post") {
        const post = await Post.findOne({
          _id: postId,
          isDeleted: false,
        }).session(session);

        if (!post) throw new Error("Post not found");
        postOwnerId = post.author;

        await Post.updateOne(
          { _id: postId },
          { $inc: { commentCount: 1 } },
          { session },
        );
      }
      // ✅ GROUP POST (আপনার আগের কোড)
      else {
        const gp = await GroupPost.findOne({
          _id: postId,
          isDeleted: { $ne: true },
        }).session(session);

        if (!gp) throw new Error("Post not found");
        postOwnerId = gp.authorId;

        await GroupPost.updateOne(
          { _id: postId },
          { $inc: { "counts.commentCount": 1 } },
          { session },
        );
      }

      // ✅ parent validation for reply (আপনার পলিমরফিক কমেন্ট লজিক ঠিক রাখা হয়েছে)
      if (isReply) {
        const parent = await Comment.findOne({
          _id: parentId,
          targetType: type,
          postId,
          isDeleted: false,
        }).session(session);

        if (!parent) throw new Error("Parent comment not found");

        parentCommentOwnerId = parent.author;

        await Comment.updateOne(
          { _id: parentId },
          { $inc: { replyCount: 1 } },
          { session },
        );
      }

      // ৩. আপনার গ্লোবাল 'Comment' কালেকশনেই ডেটা তৈরি হচ্ছে
      const created = await Comment.create(
        [
          {
            targetType: type,
            postId,
            author: userId,
            parentId: parentId || null,
            text,
          },
        ],
        { session },
      );

      createdId = created?.[0]?._id;
    });

    const comment = await Comment.findById(createdId)
      .populate("author", "name username profilePic uid")
      .lean();

    const meName = req.user?.name || req.user?.username || "Someone";

    // 🌟 ৪. পেলোড ডাইনামিকালি সেট করা (বিজ্ঞপ্তির জন্য adId পাস হবে)
    let payload = { commentId: String(comment?._id) };
    if (type === "post") payload.postId = String(postId);
    else if (type === "groupPost") payload.groupPostId = String(postId);
    else if (type === "ad") payload.adId = String(postId); // 🌟 বিজ্ঞপ্তির জন্য কাস্টম কি

    // ==========================================
    // 🔔 ৫. নোটিফিকেশন এবং পুশ সেশন গেটওয়ে
    // ==========================================
    if (isReply) {
      const to = parentCommentOwnerId ? String(parentCommentOwnerId) : null;

      if (to && to !== String(userId)) {
        const n = await Notification.create({
          toUserId: to,
          fromUserId: userId,
          // বিজ্ঞপ্তির কমেন্টে রিপ্লাই দিলে কাস্টম নোটিফিকেশন টাইপ ট্রিগার হবে
          type:
            type === "ad"
              ? "ad_comment_reply"
              : type === "post"
                ? "comment_reply"
                : "group_comment_reply",
          title: "New reply",
          body: `${meName} replied to your comment`,
          data: payload,
        });

        sendPushToUser(to, {
          title: n.title,
          body: n.body,
          data: { notificationId: String(n._id), ...n.data },
        }).catch(() => {});
      }
    } else {
      const to = postOwnerId ? String(postOwnerId) : null;

      if (to && to !== String(userId)) {
        const n = await Notification.create({
          toUserId: to,
          fromUserId: userId,
          // বিজ্ঞপ্তিতে কমেন্ট করলে বিজ্ঞাপনদাতার কাছে এলার্ট যাবে
          type:
            type === "ad"
              ? "ad_comment"
              : type === "post"
                ? "post_comment"
                : "group_post_comment",
          title: type === "ad" ? "New Ad Feedback" : "New comment",
          body:
            type === "ad"
              ? `${meName} commented on your sponsored ad`
              : `${meName} commented on your post`,
          data: payload,
        });

        sendPushToUser(to, {
          title: n.title,
          body: n.body,
          data: { notificationId: String(n._id), ...n.data },
        }).catch(() => {});
      }
    }

    return res.json({ ok: true, comment });
  } catch (e) {
    const msg = e?.message || "Comment failed";

    const status =
      msg === "Post not found" || msg === "Ad campaign not found"
        ? 404
        : msg === "Parent comment not found"
          ? 404
          : 500;

    return res.status(status).json({ ok: false, message: msg });
  } finally {
    session.endSession();
  }
};

/* ===================================================================
   ✅ GET COMMENTS (top-level)
   Route: GET /comments/:postId?type=post|groupPost&limit=20&cursor=...
=================================================================== */
export const getPostComments = async (req, res) => {
  try {
    const postId = String(req.params?.postId || "");
    const type = String(req.query?.type || "post"); // "post" | "groupPost" | "ad" 🌟
    const me = req.user?._id || null;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ ok: false, message: "Invalid post id" });
    }

    // আপনার isValidType ফাংশনে "ad" টাইপটি ইনক্লুড করে নেবেন
    // if (!isValidType(type)) return res.status(400).json({ ok: false, message: "Invalid type" });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    // ========================================================
    // 🌟 🌟 ২. ডাইনামিক টার্গেট এক্সিস্টেন্স চেক (বিজ্ঞপ্তি অন্তর্ভুক্ত করা হলো)
    // ========================================================
    let exists = false;

    if (type === "post") {
      exists = await Post.exists({ _id: postId, isDeleted: false });
    } else if (type === "groupPost") {
      exists = await GroupPost.exists({
        _id: postId,
        isDeleted: { $ne: true },
      });
    } else if (type === "ad") {
      // 🌟 স্পনসরড বিজ্ঞপ্তির অস্তিত্ব ডাটাবেসে চেক করা (অবশ্যই active স্ট্যাটাস ফিল্টার সহ)
      exists = await Ad.exists({ _id: postId, status: "active" });
    }

    if (!exists) {
      const errorMsg =
        type === "ad" ? "Ad campaign not found or inactive" : "Post not found";
      return res.status(404).json({ ok: false, message: errorMsg });
    }

    // ৩. পলিমরফিক উপায়ে কমেন্ট খুঁজে বের করা (অপরিবর্তিত রাখা হয়েছে)
    const items = await Comment.find({
      targetType: type,
      postId,
      parentId: null,
      isDeleted: false,
      ...cursorFilter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate("author", "name username avatar uid")
      .lean();

    // ৪. কমেন্টের লাইক/রিঅ্যাকশন ম্যাপ করার গ্লোবাল মেকানিজম (অপরিবর্তিত)
    if (me && items.length > 0) {
      const commentIds = items.map((c) => c._id);

      const userReactions = await CommentReaction.find({
        user: me,
        comment: { $in: commentIds },
      })
        .select("comment type")
        .lean();

      const reactionMap = new Map(
        userReactions.map((r) => [String(r.comment), r.type || "like"]),
      );

      for (const comment of items) {
        const cId = String(comment._id);
        comment.isLiked = reactionMap.has(cId);
        comment.reaction = reactionMap.get(cId) || null;
      }
    } else {
      for (const comment of items) {
        comment.isLiked = false;
        comment.reaction = null;
      }
    }

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ ok: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

/* ===================================================================
   ✅ GET REPLIES
   Route: GET /comments/replies/:commentId?limit=20&cursor=...
=================================================================== */
export const getCommentReplies = async (req, res) => {
  try {
    const commentId = String(req.params?.commentId || "");
    // console.log('replay',commentId);

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ ok: false, message: "Invalid comment id" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const parent = await Comment.findById(commentId)
      .select("postId targetType")
      .lean();
    // console.log('parent',parent);

    if (!parent)
      return res.status(404).json({ ok: false, message: "Comment not found" });

    const items = await Comment.find({
      targetType: parent.targetType,
      postId: parent.postId,
      parentId: commentId,
      isDeleted: false,
      ...cursorFilter,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate("author", "name username avatar uid")
      .lean();

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ ok: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

/* ===================================================================
   ✅ DELETE COMMENT (soft delete)
   Route: DELETE /comments/:commentId
=================================================================== */

export const deleteComment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const commentId = String(req.params?.commentId || "");
    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ ok: false, message: "Invalid comment id" });
    }

    await session.withTransaction(async () => {
      const c = await Comment.findById(commentId).session(session);
      if (!c) throw new Error("Comment not found");

      const isOwner = String(c.author) === String(userId);
      const isAdmin = String(req.user?.role || "").toUpperCase() === "ADMIN";

      if (!isOwner && !isAdmin) {
        throw new Error("Forbidden");
      }

      if (c.isDeleted) return;

      const isReply = !!c.parentId;

      // ✅ 1) comment delete
      c.isDeleted = true;
      c.text = "[deleted]";
      await c.save({ session });

      // ✅ 2) parent comment হলে post/group commentCount কমাও
      if (!isReply) {
        const totalToDecrease = 1 + (c.replyCount || 0);
        if (c.targetType === "post") {
          await Post.updateOne(
            { _id: c.postId },
            { $inc: { commentCount: -totalToDecrease } },
            { session },
          );
        } else if (c.targetType === "groupPost") {
          await GroupPost.updateOne(
            { _id: c.postId },
            { $inc: { "counts.commentCount": -totalToDecrease } },
            { session },
          );
        } else if (c.targetType === "ad") {
          await Ad.updateOne(
            { _id: c.postId },
            { $inc: { commentCount: -totalToDecrease } }, // মেইন Ad টেবিলে কমেন্ট ও তার রিপ্লাইয়ের কাউন্ট কমবে
            { session },
          );
        }
      }

      // ✅ 3) reply হলে parent replyCount কমাও
      if (isReply) {
        await Comment.updateOne(
          { _id: c.parentId, replyCount: { $gt: 0 } },
          { $inc: { replyCount: -1 } },
          { session },
        );
      }
    });

    return res.json({ ok: true, message: "Deleted" });
  } catch (e) {
    const msg = e?.message || "Delete failed";
    const status =
      msg === "Comment not found" ? 404 : msg === "Forbidden" ? 403 : 500;

    return res.status(status).json({ ok: false, message: msg });
  } finally {
    session.endSession();
  }
};

/* ===================================================================
   ✅ update COMMENT 
   Route: update /comments/:commentId
=================================================================== */
export const updateComment = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const commentId = String(req.params?.commentId || "");
    const text = String(req.body?.text || "").trim();

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ ok: false, message: "Invalid comment id" });
    }

    if (!text) {
      return res
        .status(400)
        .json({ ok: false, message: "Comment text required" });
    }

    // ✅ find comment
    const comment = await Comment.findOne({
      _id: commentId,
      isDeleted: false,
    });

    if (!comment) {
      return res.status(404).json({ ok: false, message: "Comment not found" });
    }

    // ✅ only owner can update
    if (String(comment.author) !== String(userId)) {
      return res.status(403).json({ ok: false, message: "Not allowed" });
    }

    // ✅ update text only
    comment.text = text;
    // comment.isEdited = true; // optional (recommended)
    // comment.editedAt = new Date(); // optional

    await comment.save();

    const updated = await Comment.findById(commentId)
      .populate("author", "name username profilePic uid")
      .lean();

    return res.json({
      ok: true,
      comment: updated,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Update failed",
    });
  }
};
