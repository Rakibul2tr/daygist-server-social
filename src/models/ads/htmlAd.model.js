import mongoose from "mongoose";

const HtmlAdSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Ad title is required"],
    trim: true,
  },
  html_code: {
    type: String,
    required: [true, "HTML/JS Ad code is required"],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true, // বিজ্ঞাপনটি লাইভ থাকবে কি না তা কন্ট্রোল করার জন্য
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const HtmlAd = mongoose.models.HtmlAd || mongoose.model("HtmlAd", HtmlAdSchema);
export default HtmlAd;
