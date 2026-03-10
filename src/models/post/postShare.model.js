import mongoose from "mongoose";

const postShareSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // optional: share caption
    // caption: String,
    // optional: share type (copy link / external / in-app)
    // type: { type: String, default: "external" },
  },
  { timestamps: true }
);

// postShareSchema.index({ post: 1, user: 1 }, { unique: true }); // এক user ১ পোস্ট একবার share (চাইলে remove করো)
postShareSchema.index({ post: 1, createdAt: -1 });

export default mongoose.models.PostShare ||
  mongoose.model("PostShare", postShareSchema);
