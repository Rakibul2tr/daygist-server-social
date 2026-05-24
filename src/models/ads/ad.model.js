import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    adType: {
      type: String,
      required: true,
      enum: ["image", "video"],
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
      enum: ["home_feed", "post_details", "popup"],
      default: "home_feed",
    },
    ctaLink: { type: String, trim: true }, // বিজ্ঞাপনে ক্লিক করলে যেখানে যাবে
    ctaText: { type: String, default: "Learn More" }, // বাটনের টেক্সট
    status: {
      type: String,
      enum: ["active", "paused", "expired"],
      default: "active",
    },
    duration: { type: Number, default: 0 }, // ভিডিও অ্যাডের সেকেন্ড (যেমন: ১৫ বা ৩০)
    isSkippable: { type: Boolean, default: true },
    skipAfter: { type: Number, default: 5 }, // কত সেকেন্ড পর স্কিপ করা যাবে
    impressions: { type: Number, default: 0 }, // কতজন দেখল
    clicks: { type: Number, default: 0 }, // কতজন ক্লিক করল
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true },
);

const Ad = mongoose.models.Ad || mongoose.model("Ad", adSchema);
export default Ad;
