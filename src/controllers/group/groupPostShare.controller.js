
import mongoose from "mongoose";
import GroupPost from "../../models/group/groupPost.model.js";
import GroupPostShare from "../../models/group/groupPostShare.model.js";

export const sharePost = async (req, res) => {
  try {
    const me = req.user?._id;
    const postId = req.params.postId;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid postId" });

    // ✅ ensure post exists
    const post = await GroupPost.findOne({
      _id: postId,
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    // ✅ upsert share (use userId/postId)
    const r = await GroupPostShare.updateOne(
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
    if (r?.upsertedCount === 1) {
      await GroupPost.updateOne(
        { _id: postId },
        { $inc: { "counts.shareCount": 1 } },
      );
    }

    return res.json({ success: true, message: "Shared" });
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
