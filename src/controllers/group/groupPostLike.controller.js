import mongoose from "mongoose";
import GroupPostLike from "../../models/group/groupPostLike.model.js";
import GroupPost from "../../models/group/groupPost.model.js";


export const likePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const postId = req.params.postId;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid postId" });

    const post = await GroupPost.findOne({
      _id: postId,
      isDeleted: { $ne: true },
    })
      .select("_id counts.likeCount")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    const r = await GroupPostLike.updateOne(
      {
        postId: new mongoose.Types.ObjectId(postId),
        userId: new mongoose.Types.ObjectId(me),
      },
      {
        $setOnInsert: {
          postId: new mongoose.Types.ObjectId(postId),
          userId: new mongoose.Types.ObjectId(me),
        },
      },
      { upsert: true },
    );

    // ✅ only if inserted => increment
    let nextLikeCount = Number(post?.counts?.likeCount || 0);
    if (r?.upsertedCount === 1) {
      const up = await GroupPost.findByIdAndUpdate(
        postId,
        { $inc: { "counts.likeCount": 1 } },
        { new: true, select: "counts.likeCount" },
      ).lean();
      nextLikeCount = Number(up?.counts?.likeCount || nextLikeCount + 1);
    }

    return res.json({
      success: true,
      message: "Liked",
      data: { postId, isLiked: true, likeCount: nextLikeCount },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Like failed" });
  }
};


export const unlikePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const postId = req.params.postId;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid postId" });

    const del = await GroupPostLike.deleteOne({
      postId: new mongoose.Types.ObjectId(postId),
      userId: new mongoose.Types.ObjectId(me),
    });

    let nextLikeCount = null;

    if (del?.deletedCount) {
      const up = await GroupPost.findByIdAndUpdate(
        postId,
        { $inc: { "counts.likeCount": -1 } },
        { new: true, select: "counts.likeCount" },
      ).lean();
      nextLikeCount = Number(up?.counts?.likeCount || 0);
    }

    return res.json({
      success: true,
      message: "Unliked",
      data: { postId, isLiked: false, likeCount: nextLikeCount },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Unlike failed" });
  }
};


export const getPostLikes = async (req, res) => {
  try {
    const postId = req.params.postId;
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid postId" });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const rows = await PostLike.find({ post: postId })
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
      .json({ message: e?.message || "Fetch likes failed" });
  }
};
