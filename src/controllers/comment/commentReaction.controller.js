import mongoose from "mongoose";
import Comment from "../../models/comment/comment.model.js"; 
import CommentReaction from "../../models/comment/commentReeaction.model.js";

const VALID_REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"];

export const reactToComment = async (req, res) => {
  try {
    const me = req.user?._id;
    const commentId = String(req.params.commentId || "");
    const reactionType = String(req.body.reaction || "like").toLowerCase();

    if (!me) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.isValidObjectId(commentId))
      return res.status(400).json({ message: "Invalid comment id" });
    if (!VALID_REACTIONS.includes(reactionType))
      return res.status(400).json({ message: "Invalid reaction type" });

    // ১. চেক করা কমেন্টটি ডাটাবেজে আসলেই আছে কিনা
    const comment = await Comment.findOne({ _id: commentId })
      .select("_id reactionCount")
      .lean();
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // ২. চেক করা ইউজার আগে এই কমেন্টে কোনো রিঅ্যাকশন দিয়েছিল কিনা
    const existingReaction = await CommentReaction.findOne({
      comment: commentId,
      user: me,
    });
    let nextReactionCount = Number(comment?.reactionCount || 0);

    if (!existingReaction) {
      // 👉 কেইস ১: একদম নতুন রিঅ্যাকশন (কাউন্ট ১ বাড়বে)
      await CommentReaction.create({
        comment: commentId,
        user: me,
        type: reactionType,
      });

      const up = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { reactionCount: 1 } },
        { new: true, select: "reactionCount" },
      ).lean();
      nextReactionCount = Number(up?.reactionCount || nextReactionCount + 1);

      return res.json({
        success: true,
        message: "Reacted to comment",
        data: {
          commentId,
          isReacted: true,
          reaction: reactionType,
          reactionCount: nextReactionCount,
        },
      });
    } else if (existingReaction.type === reactionType) {
      // 👉 কেইস ২: একই রিঅ্যাকশনে আবার ক্লিক (রিমুভ/Unlike হবে, কাউন্ট ১ কমবে)
      await CommentReaction.deleteOne({ _id: existingReaction._id });

      const up = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { reactionCount: -1 } },
        { new: true, select: "reactionCount" },
      ).lean();
      nextReactionCount = Number(
        up?.reactionCount || Math.max(0, nextReactionCount - 1),
      );

      return res.json({
        success: true,
        message: "Reaction removed from comment",
        data: {
          commentId,
          isReacted: false,
          reaction: null,
          reactionCount: nextReactionCount,
        },
      });
    } else {
      // 👉 কেইস ৩: রিঅ্যাকশন পরিবর্তন (কাউন্ট একই থাকবে, শুধু টাইপ পরিবর্তন হবে)
      await CommentReaction.updateOne(
        { _id: existingReaction._id },
        { $set: { type: reactionType } },
      );

      return res.json({
        success: true,
        message: "Comment reaction updated",
        data: {
          commentId,
          isReacted: true,
          reaction: reactionType,
          reactionCount: nextReactionCount,
        },
      });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ message: e?.message || "Comment reaction failed" });
  }
};
