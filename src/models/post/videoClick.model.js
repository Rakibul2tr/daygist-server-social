import mongoose from "mongoose";

const videoClickSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post", // আপনার মেইন ভিডিও বা পোস্ট মডেলের রেফারেন্স
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // যে ইউজার ভিডিওটি দেখছিল/স্কিপ করলো
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // ভিডিওর আসল মালিক বা লেখক
      required: true,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad", // কোন অ্যাডটি স্কিপ করে এই ভিডিও ক্লিকে এসেছে
      required: true,
    },
  },
  { timestamps: true },
);

// কুয়েরি পারফরম্যান্স ফাস্ট করার জন্য ইনডেক্স
videoClickSchema.index({ postId: 1, userId: 1 });

const VideoClick =
  mongoose.models.VideoClick || mongoose.model("VideoClick", videoClickSchema);
export default VideoClick;
