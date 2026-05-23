import mongoose from "mongoose";

const commentReactionSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["like", "love", "haha", "wow", "sad", "angry"], // ফেসবুক রিঅ্যাকশন লিস্ট
      default: "like",
    },
  },
  { timestamps: true },
);

// ⚡ ইউনিক ইনডেক্স: একজন ইউজার একটি কমেন্টে কেবল একটিই রিঅ্যাকশন দিতে পারবে
commentReactionSchema.index({ comment: 1, user: 1 }, { unique: true });
commentReactionSchema.index({ comment: 1, createdAt: -1 });

const CommentReaction =
  mongoose.models.CommentReaction ||
  mongoose.model("CommentReaction", commentReactionSchema);

export default CommentReaction;
