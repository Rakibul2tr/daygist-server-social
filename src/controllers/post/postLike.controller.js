
import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import PostLike from "../../models/post/postLike.model.js";

import GroupPost from "../../models/group/groupPost.model.js";
import GroupPostLike from "../../models/group/groupPostLike.model.js";

const isValidType = (t) => t === "post" || t === "groupPost";

export const likePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const id = String(req.params.postId || "");
    const type = String(req.query.type || "post"); // post | groupPost
    // console.log("type", req.query.type);

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
        .select("_id counts.likeCount")
        .lean();
      // console.log('post',post);

      if (!post) return res.status(404).json({ message: "Post not found" });

      const r = await GroupPostLike.updateOne(
        { postId: id, userId: me },
        { $setOnInsert: { postId: id, userId: me } },
        { upsert: true },
      );

      let nextLikeCount = Number(post?.counts?.likeCount || 0);
      if (r?.upsertedCount === 1) {
        const up = await GroupPost.findByIdAndUpdate(
          id,
          { $inc: { "counts.likeCount": 1 } },
          { new: true, select: "counts.likeCount" },
        ).lean();
        nextLikeCount = Number(up?.counts?.likeCount || nextLikeCount + 1);
      }

      return res.json({
        success: true,
        message: "Liked",
        data: { id, type, isLiked: true, likeCount: nextLikeCount },
      });
    }

    // ✅ NORMAL POST
    const post = await Post.findOne({ _id: id, isDeleted: false })
      .select("_id likeCount")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const r = await PostLike.updateOne(
      { post: id, user: me },
      { $setOnInsert: { post: id, user: me } },
      { upsert: true },
    );

    let nextLikeCount = Number(post?.likeCount || 0);
    if (r?.upsertedCount === 1) {
      const up = await Post.findByIdAndUpdate(
        id,
        { $inc: { likeCount: 1 } },
        { new: true, select: "likeCount" },
      ).lean();
      nextLikeCount = Number(up?.likeCount || nextLikeCount + 1);
    }

    return res.json({
      success: true,
      message: "Liked",
      data: { id, type, isLiked: true, likeCount: nextLikeCount },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Like failed" });
  }
};

export const unlikePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const id = String(req.params.postId || "");
    const type = String(req.query.type || "post");

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });
    if (!isValidType(type))
      return res.status(400).json({ message: "Invalid type" });

    // ✅ GROUP POST
    if (type === "groupPost") {
      const del = await GroupPostLike.deleteOne({ postId: id, userId: me });

      let nextLikeCount = null;
      if (del?.deletedCount) {
        const up = await GroupPost.findByIdAndUpdate(
          id,
          { $inc: { "counts.likeCount": -1 } },
          { new: true, select: "counts.likeCount" },
        ).lean();
        nextLikeCount = Number(up?.counts?.likeCount || 0);
      }

      return res.json({
        success: true,
        message: "Unliked",
        data: { id, type, isLiked: false, likeCount: nextLikeCount },
      });
    }

    // ✅ NORMAL POST
    const del = await PostLike.deleteOne({ post: id, user: me });

    let nextLikeCount = null;
    if (del?.deletedCount) {
      const up = await Post.findByIdAndUpdate(
        id,
        { $inc: { likeCount: -1 } },
        { new: true, select: "likeCount" },
      ).lean();
      nextLikeCount = Number(up?.likeCount || 0);
    }

    return res.json({
      success: true,
      message: "Unliked",
      data: { id, type, isLiked: false, likeCount: nextLikeCount },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Unlike failed" });
  }
};

export const getPostLikes = async (req, res) => {
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
      const rows = await GroupPostLike.find({ postId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name username profilePic avatar uid")
        .lean();

      const users = rows.map((r) => r.userId).filter(Boolean);
      return res.json({ success: true, page, limit, users });
    }

    // ✅ NORMAL POST
    const rows = await PostLike.find({ post: id })
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
      .json({ message: e?.message || "Fetch likes failed" });
  }
};
