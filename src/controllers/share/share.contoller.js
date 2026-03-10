import mongoose from "mongoose";

import Post from "../../models/post/post.model.js";
import PostShare from "../../models/post/postShare.model.js";

import GroupPost from "../../models/group/groupPost.model.js";
import GroupPostShare from "../../models/group/groupPostShare.model.js";

const isValidType = (t) => t === "post" || t === "groupPost";

/* =========================
   POST /shares/:id?type=
========================= */
export const sharePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const id = String(req.params.postId || "");
    const type = String(req.query.type || "post");
    // console.log('id',id,type);
    

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });
    if (!isValidType(type))
      return res.status(400).json({ message: "Invalid type" });

    // ✅ GROUP POST
    if (type === "groupPost") {
      const post = await GroupPost.findOne({
        _id: id,
        isDeleted: { $ne: true },
      })
        .select("_id counts.shareCount")
        .lean();

      if (!post) return res.status(404).json({ message: "Post not found" });

      const r = await GroupPostShare.updateOne(
        { postId: id, userId: me },
        { $setOnInsert: { postId: id, userId: me } },
        { upsert: true },
      );

      let nextShareCount = Number(post?.counts?.shareCount || 0);
      if (r?.upsertedCount === 1) {
        const up = await GroupPost.findByIdAndUpdate(
          id,
          { $inc: { "counts.shareCount": 1 } },
          { new: true, select: "counts.shareCount" },
        ).lean();
        nextShareCount = Number(up?.counts?.shareCount || nextShareCount + 1);
      }

      return res.json({
        success: true,
        message: "Shared",
        data: { id, type, isShared: true, shareCount: nextShareCount },
      });
    }

    // ✅ NORMAL POST
    const post = await Post.findOne({ _id: id, isDeleted: false })
      .select("_id shareCount")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    const r = await PostShare.updateOne(
      { post: id, user: me },
      { $setOnInsert: { post: id, user: me } },
      { upsert: true },
    );

    let nextShareCount = Number(post?.shareCount || 0);
    if (r?.upsertedCount === 1) {
      const up = await Post.findByIdAndUpdate(
        id,
        { $inc: { shareCount: 1 } },
        { new: true, select: "shareCount" },
      ).lean();
      nextShareCount = Number(up?.shareCount || nextShareCount + 1);
    }

    return res.json({
      success: true,
      message: "Shared",
      data: { id, type, isShared: true, shareCount: nextShareCount },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Share failed" });
  }
};

/* =========================
   GET /shares/:id?type=&page=&limit=
========================= */
export const getPostShares = async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const type = String(req.query.type || "post");

    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });
    if (!isValidType(type))
      return res.status(400).json({ message: "Invalid type" });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    // ✅ GROUP POST
    if (type === "groupPost") {
      const rows = await GroupPostShare.find({ postId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name username profilePic avatar uid")
        .lean();

      const users = rows.map((r) => r.userId).filter(Boolean);
      return res.json({ success: true, page, limit, users });
    }

    // ✅ NORMAL POST
    const rows = await PostShare.find({ post: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name username profilePic avatar uid")
      .lean();

    const users = rows.map((r) => r.user).filter(Boolean);
    return res.json({ success: true, page, limit, users });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch shares failed" });
  }
};
