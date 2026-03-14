import PostShare from "../../models/post/postShare.model.js";
import Post from "../../models/post/post.model.js";
import mongoose from "mongoose";

export const sharePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const postId = req.params.postId;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid postId" });

    const r = await PostShare.updateOne(
      { post: postId, user: me },
      { $setOnInsert: { post: postId, user: me } },
      { upsert: true }
    );

    if (r.upsertedCount === 1) {
      await Post.updateOne({ _id: postId }, { $inc: { shareCount: 1 } });
    }

    return res.json({ success: true, shared: true });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Share failed" });
  }
};

export const getPostShares = async (req, res) => {
  try {
    const postId = req.params.postId;
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid postId" });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const rows = await PostShare.find({ post: postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name username avatar profilePic")
      .lean();

    const users = rows.map((r) => r.user).filter(Boolean);
    return res.json({ success: true, page, limit, users });
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Fetch shares failed" });
  }
};
