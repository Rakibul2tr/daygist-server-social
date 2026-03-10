import mongoose from "mongoose";

const videoViewSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ per user per post only once
videoViewSchema.index({ post: 1, user: 1 }, { unique: true });

const VideoView =
  mongoose.models.PostView || mongoose.model("PostView", videoViewSchema);
export default VideoView;
