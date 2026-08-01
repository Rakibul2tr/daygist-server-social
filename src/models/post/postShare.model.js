import mongoose from "mongoose";

const postShareSchema = new mongoose.Schema(
  {
    // 🌟 ১. ডাইনামিক রেফারেন্সের জন্য targetType ফিল্ড যুক্ত করা হলো
    targetType: {
      type: String,
      enum: ["Post", "Ad","groupPost"], // কোন টেবিলে শেয়ার হচ্ছে (সাধারণ পোস্ট নাকি বিজ্ঞাপন)
      required: true,
      default: "Post",
    },
    // 🌟 ২. refPath দিয়ে ডাইনামিকালি targetType এর সাথে লক করা হলো
    post: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType", // ➔ targetType এর ভ্যালু যা হবে, ref অটোমেটিক সেই টেবিল লক করবে
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// ইন্ডেক্সিং (আপনার ওল্ড প্যাটার্ন হুবহু ঠিক রাখা হয়েছে)
postShareSchema.index({ post: 1, createdAt: -1 });
postShareSchema.index({ user: 1, createdAt: -1 });

const PostShare =
  mongoose.models.PostShare || mongoose.model("PostShare", postShareSchema);
export default PostShare;
