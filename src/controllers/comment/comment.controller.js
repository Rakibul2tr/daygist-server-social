// // FILE: src/controllers/comment/comment.controller.js
// import mongoose from "mongoose";
// import Post from "../../models/post/post.model.js";
// import Comment from "../../models/comment/comment.model.js";
// import { parseCursor, buildCursorFilter } from "../../utils/cursor.js";
// import GroupPostComment from "../../models/group/groupPostComment.model.js";
// import GroupPost from "../../models/group/groupPost.model.js";
// import Notification from "../../models/notification/notification.model.js";
// import { sendPushToUser } from "../../services/push/sendPushToUser.js";

// export const createComment = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     const userId = req.user?._id;
//     if (!userId)
//       return res.status(401).json({ ok: false, message: "Unauthorized" });

//     const postId = req.params?.postId;
//     const text = String(req.body?.text || "").trim();
//     const parentId = req.body?.parentId || null;
//    const type=req?.body?.type
//    console.log('comment req',req.body);

//     if (!text) {
//       return res.status(400).json({ ok: false, message: "Comment required" });
//     }

//     // ✅ capture notify targets
//     let postOwnerId = null;
//     let parentCommentOwnerId = null;
//     let isReply = !!parentId;

//     await session.withTransaction(async () => {
//       const post = await Post.findOne({
//         _id: postId,
//         isDeleted: false,
//       }).session(session);
//       if (!post) throw new Error("Post not found");

//       // ✅ post owner for top-level comment
//       postOwnerId = post?.author; // তোমার schema অনুযায়ী (author / authorId)

//       // if reply, parent must exist and belong to same post
//       let parent = null;
//       if (parentId) {
//         parent = await Comment.findOne({
//           _id: parentId,
//           postId,
//           isDeleted: false,
//         }).session(session);

//         if (!parent) throw new Error("Parent comment not found");

//         parentCommentOwnerId = parent?.author;
//       }

//       const c = await Comment.create(
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

//       await Post.updateOne(
//         { _id: postId },
//         { $inc: { commentCount: 1 } },
//         { session },
//       );

//       if (parentId) {
//         await Comment.updateOne(
//           { _id: parentId },
//           { $inc: { replyCount: 1 } },
//           { session },
//         );
//       }

//       req.__comment = c[0];
//     });

//     const comment = await Comment.findById(req.__comment._id)
//       .populate("author", "name username profilePic uid")
//       .lean();

//     // ✅ AFTER transaction commit -> create notification + push (fire & forget)
//     // Rule:
//     // - reply => notify parent comment owner
//     // - top-level => notify post owner
//     const meName = req.user?.name || req.user?.username || "Someone";

//     if (isReply) {
//       const to = parentCommentOwnerId ? String(parentCommentOwnerId) : null;
//       if (to && to !== String(userId)) {
//         const n = await Notification.create({
//           toUserId: to,
//           fromUserId: userId,
//           type: "comment_reply",
//           title: "New reply",
//           body: `${meName} replied to your comment`,
//           data: { postId: String(postId), commentId: String(comment?._id) },
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
//           type: "post_comment",
//           title: "New comment",
//           body: `${meName} commented on your post`,
//           data: { postId: String(postId), commentId: String(comment?._id) },
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
//     const status = msg === "Post not found" ? 404 : 500;
//     return res.status(status).json({ ok: false, message: msg });
//   } finally {
//     session.endSession();
//   }
// };

// // ✅ Get comments of a post (only top-level)
// export const getPostComments = async (req, res) => {
//   try {
//     const postId = req.params?.postId;

//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = parseCursor(req.query.cursor);
//     const cursorFilter = buildCursorFilter(cursor);

//     // optional: ensure post exists (cheap)
//     const post = await Post.findOne({ _id: postId, isDeleted: false })
//       .select("_id")
//       .lean();
//     if (!post)
//       return res.status(404).json({ ok: false, message: "Post not found" });

//     const items = await Comment.find({
//       postId,
//       parentId: null,
//       isDeleted: false,
//       ...cursorFilter,
//     })
//       .sort({ createdAt: -1, _id: -1 })
//       .limit(limit)
//       .populate("author", "name username avatar uid")
//       .lean();

//     const nextCursor =
//       items.length > 0
//         ? {
//             createdAt: items[items.length - 1].createdAt,
//             _id: items[items.length - 1]._id,
//           }
//         : null;

//     return res.json({ ok: true, items, nextCursor });
//   } catch (e) {
//     return res.status(500).json({ ok: false, message: e?.message || "Failed" });
//   }
// };

// // ✅ Get replies of a comment
// export const getCommentReplies = async (req, res) => {
//   try {
//     const commentId = req.params?.commentId;

//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = parseCursor(req.query.cursor);
//     const cursorFilter = buildCursorFilter(cursor);

//     const parent = await Comment.findById(commentId).select("postId").lean();
//     if (!parent)
//       return res.status(404).json({ ok: false, message: "Comment not found" });

//     const items = await Comment.find({
//       postId: parent.postId,
//       parentId: commentId,
//       isDeleted: false,
//       ...cursorFilter,
//     })
//       .sort({ createdAt: -1, _id: -1 })
//       .limit(limit)
//       .populate("author", "name username profilePic uid")
//       .lean();

//     const nextCursor =
//       items.length > 0
//         ? {
//             createdAt: items[items.length - 1].createdAt,
//             _id: items[items.length - 1]._id,
//           }
//         : null;

//     return res.json({ ok: true, items, nextCursor });
//   } catch (e) {
//     return res.status(500).json({ ok: false, message: e?.message || "Failed" });
//   }
// };

// // ✅ Soft delete (commentCount কমাই না — Facebook style)
// export const deleteComment = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     const userId = req.user?._id;
//     if (!userId)
//       return res.status(401).json({ ok: false, message: "Unauthorized" });

//     const commentId = req.params?.commentId;

//     await session.withTransaction(async () => {
//       const c = await Comment.findById(commentId).session(session);
//       if (!c) throw new Error("Comment not found");

//       // ✅ only owner (or admin) can delete
//       const isOwner = String(c.author) === String(userId);
//       const isAdmin = String(req.user?.role || "").toUpperCase() === "ADMIN";
//       if (!isOwner && !isAdmin) throw new Error("Forbidden");

//       if (c.isDeleted) return;

//       c.isDeleted = true;
//       c.text = "[deleted]";
//       await c.save({ session });
//     });

//     return res.json({ ok: true, message: "Deleted" });
//   } catch (e) {
//     const msg = e?.message || "Delete failed";
//     const status =
//       msg === "Comment not found" ? 404 : msg === "Forbidden" ? 403 : 500;
//     return res.status(status).json({ ok: false, message: msg });
//   } finally {
//     session.endSession();
//   }
// };

// /** ------------------------------------------------------------------
//  * ✅ Create comment (and reply) for GROUP POST
//  * POST /group-posts/:postId/comments
//  * body: { text, parentId? }
//  * ------------------------------------------------------------------ */
// // export const createGroupPostComment = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   try {
// //     const userId = req.user?._id;
// //     if (!userId) {
// //       return res.status(401).json({ ok: false, message: "Unauthorized" });
// //     }

// //     const postId = req.params?.postId;
// //     const text = String(req.body?.text || "").trim();
// //     const parentId = req.body?.parentId || null;

// //     if (!mongoose.isValidObjectId(postId)) {
// //       return res.status(400).json({ ok: false, message: "Invalid post id" });
// //     }
// //     if (parentId && !mongoose.isValidObjectId(parentId)) {
// //       return res.status(400).json({ ok: false, message: "Invalid parent id" });
// //     }
// //     if (!text) {
// //       return res.status(400).json({ ok: false, message: "Comment required" });
// //     }

// //     await session.withTransaction(async () => {
// //       const post = await GroupPost.findOne({
// //         _id: postId,
// //         isDeleted: { $ne: true },
// //       }).session(session);

// //       if (!post) throw new Error("Post not found");

// //       // ✅ if reply, parent must exist and belong to same post
// //       let parent = null;
// //       if (parentId) {
// //         parent = await GroupPostComment.findOne({
// //           _id: parentId,
// //           postId,
// //           isDeleted: { $ne: true },
// //         }).session(session);

// //         if (!parent) throw new Error("Parent comment not found");
// //       }

// //       const created = await GroupPostComment.create(
// //         [
// //           {
// //             postId,
// //             userId,
// //             parentId: parentId || null,
// //             text,
// //             isDeleted: false,
// //           },
// //         ],
// //         { session },
// //       );

// //       // ✅ increment group post commentCount always (like post)
// //       await GroupPost.updateOne(
// //         { _id: postId },
// //         { $inc: { "counts.commentCount": 1 } },
// //         { session },
// //       );

// //       // ✅ if reply: increment parent replyCount (like post)
// //       if (parentId) {
// //         await GroupPostComment.updateOne(
// //           { _id: parentId },
// //           { $inc: { replyCount: 1 } },
// //           { session },
// //         );
// //       }

// //       req.__groupComment = created?.[0];
// //     });

// //     const comment = await GroupPostComment.findById(req.__groupComment._id)
// //       .populate("userId", "name username avatarUrl avatarKey uid")
// //       .lean();

// //     // ✅ UI friendly (like your style)
// //     const out = comment
// //       ? { ...comment, user: comment.userId, userId: undefined }
// //       : null;

// //     return res.json({ ok: true, comment: out });
// //   } catch (e) {
// //     const msg = e?.message || "Comment failed";
// //     const status =
// //       msg === "Post not found"
// //         ? 404
// //         : msg === "Parent comment not found"
// //           ? 404
// //           : 500;
// //     return res.status(status).json({ ok: false, message: msg });
// //   } finally {
// //     session.endSession();
// //   }
// // };

// export const createGroupPostComment = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ ok: false, message: "Unauthorized" });
//     }

//     const postId = req.params?.postId;
//     const text = String(req.body?.text || "").trim();
//     const parentId = req.body?.parentId || null;

//     if (!mongoose.isValidObjectId(postId)) {
//       return res.status(400).json({ ok: false, message: "Invalid post id" });
//     }
//     if (parentId && !mongoose.isValidObjectId(parentId)) {
//       return res.status(400).json({ ok: false, message: "Invalid parent id" });
//     }
//     if (!text) {
//       return res.status(400).json({ ok: false, message: "Comment required" });
//     }

//     // ✅ notify targets
//     let groupPostOwnerId = null; // GroupPost authorId
//     let parentCommentOwnerId = null;
//     let isReply = !!parentId;

//     await session.withTransaction(async () => {
//       const post = await GroupPost.findOne({
//         _id: postId,
//         isDeleted: { $ne: true },
//       }).session(session);

//       if (!post) throw new Error("Post not found");

//       groupPostOwnerId = post?.authorId;

//       let parent = null;
//       if (parentId) {
//         parent = await GroupPostComment.findOne({
//           _id: parentId,
//           postId,
//           isDeleted: { $ne: true },
//         }).session(session);

//         if (!parent) throw new Error("Parent comment not found");

//         parentCommentOwnerId = parent?.userId;
//       }

//       const created = await GroupPostComment.create(
//         [
//           {
//             postId,
//             userId,
//             parentId: parentId || null,
//             text,
//             isDeleted: false,
//           },
//         ],
//         { session },
//       );

//       await GroupPost.updateOne(
//         { _id: postId },
//         { $inc: { "counts.commentCount": 1 } },
//         { session },
//       );

//       if (parentId) {
//         await GroupPostComment.updateOne(
//           { _id: parentId },
//           { $inc: { replyCount: 1 } },
//           { session },
//         );
//       }

//       req.__groupComment = created?.[0];
//     });

//     const comment = await GroupPostComment.findById(req.__groupComment._id)
//       .populate("userId", "name username avatarUrl avatarKey uid")
//       .lean();

//     const out = comment
//       ? { ...comment, user: comment.userId, userId: undefined }
//       : null;

//     // ✅ AFTER commit -> notify + push
//     const meName = req.user?.name || req.user?.username || "Someone";

//     if (isReply) {
//       const to = parentCommentOwnerId ? String(parentCommentOwnerId) : null;
//       if (to && to !== String(userId)) {
//         const n = await Notification.create({
//           toUserId: to,
//           fromUserId: userId,
//           type: "group_comment_reply",
//           title: "New reply",
//           body: `${meName} replied to your comment`,
//           data: { groupPostId: String(postId), commentId: String(out?._id) },
//         });

//         sendPushToUser(to, {
//           title: n.title,
//           body: n.body,
//           data: { notificationId: String(n._id), ...n.data },
//         }).catch(() => {});
//       }
//     } else {
//       const to = groupPostOwnerId ? String(groupPostOwnerId) : null;
//       if (to && to !== String(userId)) {
//         const n = await Notification.create({
//           toUserId: to,
//           fromUserId: userId,
//           type: "group_post_comment",
//           title: "New comment",
//           body: `${meName} commented on your post`,
//           data: { groupPostId: String(postId), commentId: String(out?._id) },
//         });

//         sendPushToUser(to, {
//           title: n.title,
//           body: n.body,
//           data: { notificationId: String(n._id), ...n.data },
//         }).catch(() => {});
//       }
//     }

//     return res.json({ ok: true, comment: out });
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

// /** ------------------------------------------------------------------
//  * ✅ Get comments of a GROUP POST (only top-level)
//  * GET /group-posts/:postId/comments?limit=20&cursor=...
//  * ------------------------------------------------------------------ */
// export const getGroupPostComments = async (req, res) => {
//   try {
//     const postId = req.params?.postId;

//     if (!mongoose.isValidObjectId(postId)) {
//       return res.status(400).json({ ok: false, message: "Invalid post id" });
//     }

//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = parseCursor(req.query.cursor);
//     const cursorFilter = buildCursorFilter(cursor);

//     // ✅ ensure post exists (like post)
//     const post = await GroupPost.findOne({
//       _id: postId,
//       isDeleted: { $ne: true },
//     })
//       .select("_id")
//       .lean();

//     if (!post) {
//       return res.status(404).json({ ok: false, message: "Post not found" });
//     }

//     const itemsRaw = await GroupPostComment.find({
//       postId,
//       parentId: null,
//       isDeleted: { $ne: true },
//       ...cursorFilter,
//     })
//       .sort({ createdAt: -1, _id: -1 })
//       .limit(limit)
//       .populate("userId", "name username avatarUrl avatarKey uid")
//       .lean();

//     const items = (itemsRaw || []).map((c) => ({
//       ...c,
//       user: c.userId,
//       userId: undefined,
//     }));

//     const nextCursor =
//       itemsRaw.length > 0
//         ? {
//             createdAt: itemsRaw[itemsRaw.length - 1].createdAt,
//             _id: itemsRaw[itemsRaw.length - 1]._id,
//           }
//         : null;

//     return res.json({ ok: true, items, nextCursor });
//   } catch (e) {
//     return res.status(500).json({ ok: false, message: e?.message || "Failed" });
//   }
// };

// /** ------------------------------------------------------------------
//  * ✅ Get replies of a GROUP POST comment
//  * GET /group-post-comments/:commentId/replies?limit=20&cursor=...
//  * ------------------------------------------------------------------ */
// export const getGroupPostCommentReplies = async (req, res) => {
//   try {
//     const commentId = req.params?.commentId;

//     if (!mongoose.isValidObjectId(commentId)) {
//       return res.status(400).json({ ok: false, message: "Invalid comment id" });
//     }

//     const limit = Math.min(Number(req.query.limit) || 20, 50);
//     const cursor = parseCursor(req.query.cursor);
//     const cursorFilter = buildCursorFilter(cursor);

//     const parent = await GroupPostComment.findById(commentId)
//       .select("postId")
//       .lean();

//     if (!parent) {
//       return res.status(404).json({ ok: false, message: "Comment not found" });
//     }

//     const itemsRaw = await GroupPostComment.find({
//       postId: parent.postId,
//       parentId: commentId,
//       isDeleted: { $ne: true },
//       ...cursorFilter,
//     })
//       .sort({ createdAt: -1, _id: -1 })
//       .limit(limit)
//       .populate("userId", "name username avatarUrl avatarKey uid")
//       .lean();

//     const items = (itemsRaw || []).map((c) => ({
//       ...c,
//       user: c.userId,
//       userId: undefined,
//     }));

//     const nextCursor =
//       itemsRaw.length > 0
//         ? {
//             createdAt: itemsRaw[itemsRaw.length - 1].createdAt,
//             _id: itemsRaw[itemsRaw.length - 1]._id,
//           }
//         : null;

//     return res.json({ ok: true, items, nextCursor });
//   } catch (e) {
//     return res.status(500).json({ ok: false, message: e?.message || "Failed" });
//   }
// };

// /** ------------------------------------------------------------------
//  * ✅ Soft delete GROUP POST comment (commentCount কমাই না — Facebook style)
//  * DELETE /group-post-comments/:commentId
//  * ------------------------------------------------------------------ */

// export const deleteGroupPostComment = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ ok: false, message: "Unauthorized" });
//     }

//     const commentId = req.params?.commentId;
//     if (!mongoose.isValidObjectId(commentId)) {
//       return res.status(400).json({ ok: false, message: "Invalid comment id" });
//     }

//     await session.withTransaction(async () => {
//       const c = await GroupPostComment.findById(commentId).session(session);
//       if (!c) throw new Error("Comment not found");

//       const isOwner = String(c.userId) === String(userId);
//       const isAdmin = String(req.user?.role || "").toUpperCase() === "ADMIN";
//       if (!isOwner && !isAdmin) throw new Error("Forbidden");

//       if (c.isDeleted) return;

//       c.isDeleted = true;
//       c.text = "[deleted]";
//       await c.save({ session });
//     });

//     return res.json({ ok: true, message: "Deleted" });
//   } catch (e) {
//     const msg = e?.message || "Delete failed";
//     const status =
//       msg === "Comment not found" ? 404 : msg === "Forbidden" ? 403 : 500;
//     return res.status(status).json({ ok: false, message: msg });
//   } finally {
//     session.endSession();
//   }
// };

// controllers/comment/comment.controller.js
import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import GroupPost from "../../models/group/groupPost.model.js";
import Comment from "../../models/comment/comment.model.js";
import Notification from "../../models/notification/notification.model.js";
import { sendPushToUser } from "../../services/push/sendPushToUser.js"; // adjust path

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

const isValidType = (t) => t === "post" || t === "groupPost";

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
//     const type = String(req.body?.type || "post"); // ✅ "post" | "groupPost"
//     // console.log(postId,text,parentId,type);

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

//     // ✅ notify targets
//     let postOwnerId = null;
//     let parentCommentOwnerId = null;
//     const isReply = !!parentId;

//     let createdId = null;

//     await session.withTransaction(async () => {
//       // ✅ find target + increment commentCount
//       if (type === "post") {
//         const post = await Post.findOne({
//           _id: postId,
//           isDeleted: false,
//         }).session(session);
//         if (!post) throw new Error("Post not found");
//         postOwnerId = post.author;

//         await Post.updateOne(
//           { _id: postId },
//           { $inc: { commentCount: 1 } },
//           { session },
//         );
//       } else {
//         // console.log('post id',postId);

//         const gp = await GroupPost.findOne({
//           _id: postId,
//           isDeleted: { $ne: true },
//         }).session(session);
//         // console.log('group post',gp);

//         if (!gp) throw new Error("Post not found");
//         postOwnerId = gp.authorId;

//         await GroupPost.updateOne(
//           { _id: postId },
//           { $inc: { "counts.commentCount": 1 } },
//           { session },
//         );
//       }

//       // ✅ parent validation (must be same target)
//       if (parentId) {
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
//     });

//     const comment = await Comment.findById(createdId)
//       .populate("author", "name username profilePic uid")
//       .lean();

//     // ✅ notify + push after commit
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
    const type = String(req.body?.type || "post"); // "post" | "groupPost"

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ ok: false, message: "Invalid post id" });
    }

    if (parentId && !mongoose.isValidObjectId(parentId)) {
      return res.status(400).json({ ok: false, message: "Invalid parent id" });
    }

    if (!isValidType(type)) {
      return res.status(400).json({ ok: false, message: "Invalid type" });
    }

    if (!text) {
      return res.status(400).json({ ok: false, message: "Comment required" });
    }

    let postOwnerId = null;
    let parentCommentOwnerId = null;
    const isReply = !!parentId;
    let createdId = null;

    await session.withTransaction(async () => {
      // ✅ target post/group post check
      if (type === "post") {
        const post = await Post.findOne({
          _id: postId,
          isDeleted: false,
        }).session(session);

        if (!post) throw new Error("Post not found");
        postOwnerId = post.author;

        // ✅ only top-level comment increments post commentCount
        await Post.updateOne(
          { _id: postId },
          { $inc: { commentCount: 1 } },
          { session },
        );
        // if (!isReply) {
        //   await Post.updateOne(
        //     { _id: postId },
        //     { $inc: { commentCount: 1 } },
        //     { session },
        //   );
        // }
      } else {
        const gp = await GroupPost.findOne({
          _id: postId,
          isDeleted: { $ne: true },
        }).session(session);

        if (!gp) throw new Error("Post not found");
        postOwnerId = gp.authorId;

        // ✅ only top-level comment increments group post commentCount
        await GroupPost.updateOne(
          { _id: postId },
          { $inc: { "counts.commentCount": 1 } },
          { session },
        );
        // if (!isReply) {
        //   await GroupPost.updateOne(
        //     { _id: postId },
        //     { $inc: { "counts.commentCount": 1 } },
        //     { session },
        //   );
        // }
      }

      // ✅ parent validation for reply
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

    const payload =
      type === "post"
        ? { postId: String(postId), commentId: String(comment?._id) }
        : { groupPostId: String(postId), commentId: String(comment?._id) };

    if (isReply) {
      const to = parentCommentOwnerId ? String(parentCommentOwnerId) : null;

      if (to && to !== String(userId)) {
        const n = await Notification.create({
          toUserId: to,
          fromUserId: userId,
          type: type === "post" ? "comment_reply" : "group_comment_reply",
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
          type: type === "post" ? "post_comment" : "group_post_comment",
          title: "New comment",
          body: `${meName} commented on your post`,
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
      msg === "Post not found"
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
    const type = String(req.query?.type || "post");

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ ok: false, message: "Invalid post id" });
    }
    if (!isValidType(type)) {
      return res.status(400).json({ ok: false, message: "Invalid type" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    // ✅ ensure target exists
    const exists =
      type === "post"
        ? await Post.exists({ _id: postId, isDeleted: false })
        : await GroupPost.exists({ _id: postId, isDeleted: { $ne: true } });

    if (!exists)
      return res.status(404).json({ ok: false, message: "Post not found" });

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
        if (c.targetType === "post") {
          await Post.updateOne(
            { _id: c.postId },
            { $inc: { commentCount: -1 } },
            { session },
          );
        } else if (c.targetType === "groupPost") {
          await GroupPost.updateOne(
            { _id: c.postId },
            { $inc: { "counts.commentCount": -1 } },
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