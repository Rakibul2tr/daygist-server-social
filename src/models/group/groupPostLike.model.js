import mongoose from "mongoose";

const { Schema } = mongoose;

const GroupPostLikeSchema = new Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupPost",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// ✅ one user can like only once per post
GroupPostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

const GroupPostLike =
  mongoose.models.GroupPostLike ||
  mongoose.model("GroupPostLike", GroupPostLikeSchema);

export default GroupPostLike;
