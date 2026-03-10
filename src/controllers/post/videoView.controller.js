import mongoose from "mongoose";
import Post from "../../models/post/post.model.js";
import VideoView from "../../models/post/videoView.model.js";

export const addView = async (req, res) => {
  try {
    const me = req.user?._id;
    const postId = req.params.postId;

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ message: "Invalid postId" });

    // ✅ try insert view log (unique)
    let inserted = false;
    try {
      await VideoView.create({ post: postId, user: me });
      inserted = true;
    } catch (e) {
      // duplicate => already viewed
      if (e?.code !== 11000) throw e;
    }

    if (inserted) {
      await Post.updateOne({ _id: postId }, { $inc: { viewCount: 1 } });
    }

    return res.json({ success: true, counted: inserted });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "View failed" });
  }
};
