import mongoose from "mongoose";

const { Schema } = mongoose;

const GroupPostShareSchema = new Schema(
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

// ✅ one user can share only once per post (you can change later if you want multiple)
GroupPostShareSchema.index({ postId: 1, userId: 1 }, { unique: true });

const GroupPostShare =
  mongoose.models.GroupPostShare ||
  mongoose.model("GroupPostShare", GroupPostShareSchema);

export default GroupPostShare;
