import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    // বিজ্ঞাপনদাতার ইউজার আইডি (টাকা কাটার জন্য এটি অত্যন্ত জরুরি)
    advertiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    adType: {
      type: String,
      required: true,
      enum: ["image", "video"],
    },
    adCategory: {
      type: String,
      required: true,
      enum: ["ecommerce", "other"],
    },
    // 🌟 ওয়াসাবি স্টোরেজ অবজেক্ট স্ট্রাকচার
    media: {
      url: { type: String, required: true },
      key: { type: String, required: true },
      provider: { type: String, default: "wasabi" },
    },
    // ভিডিও অ্যাডের জন্য এক্সট্রা কভার বা থাম্বনেইল (অপশনাল)
    thumbnail: {
      url: { type: String },
      key: { type: String },
      provider: { type: String },
    },
    placement: {
      type: String,
      required: true,
      // 📝 'video_player' প্লেসমেন্টটি যুক্ত করা হয়েছে ইউটিউব স্টাইল ভিডিওর জন্য
      enum: ["home_feed", "post_details", "popup", "video_player"],
      default: "home_feed",
    },
    ctaLink: { type: String, trim: true }, // বিজ্ঞাপনে ক্লিক করলে যেখানে যাবে
    ctaText: { type: String, default: "Learn More" }, // বাটনের টেক্সট
    status: {
      type: String,
      // 📝 'out_of_budget' স্ট্যাটাসটি যুক্ত করা হয়েছে বাজেট শেষ হলে অটো অফ করার জন্য
      enum: ["active", "paused", "expired", "out_of_budget", "pending","rejected","declined"],
      default: "pending",
    },
    gender: {
      type: [String],
      enum: ["male", "female", "other"],
      default: [],
    },
    age: {
      type: String,
      enum: ["all", "18-24", "25-34", "35-54", "55+"],
      default: "all",
    },

    // 📝 Mongoose টাইপ ডিফাইন করা হয়েছে এবং ডিফল্ট ভ্যালু ঠিক করা হয়েছে
    total_budget: { type: Number, required: true, default: 5000 },
    remaining_budget: { type: Number, required: true, default: 5000 }, // 🌟 নতুন ফিল্ড (বাজেট ট্র্যাকিংয়ের জন্য)
    cost_per_view: { type: Number, required: true, default: 1 },

    duration: { type: Number, default: 0 }, // ভিডিও অ্যাডের সেকেন্ড (যেমন: ১৫ বা ৩০)
    isSkippable: { type: Boolean, default: true },
    skipAfter: { type: Number, default: 5 }, // কত সেকেন্ড পর স্কিপ করা যাবে

    impressions: { type: Number, default: 0 }, // কতজন দেখল
    clicks: { type: Number, default: 0 }, // কতজন ক্লিক করল
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    updateReason: { type: String, default: "" },
    country: {
      type: [String],
      default: [],
    },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true },
);

const Ad = mongoose.models.Ad || mongoose.model("Ad", adSchema);
export default Ad;
