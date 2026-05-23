import mongoose from "mongoose";

const postLikeSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: ["like", "love", "haha", "wow", "sad", "angry"], // নির্দিষ্ট অপশন
      default: "like",
    },
  },
  { timestamps: true },
);

postLikeSchema.index({ post: 1, user: 1 }, { unique: true });
postLikeSchema.index({ post: 1, createdAt: -1 });
postLikeSchema.index({ user: 1, createdAt: -1 });

const PostLike= mongoose.models.PostLike ||
  mongoose.model("PostLike", postLikeSchema);
export default PostLike;