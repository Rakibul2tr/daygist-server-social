import mongoose from "mongoose";


const EcomBannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    imageUrl: { type: String, required: true },

    // Optional deep link
    linkType: {
      type: String,
      enum: ["none", "product", "category", "shop"],
      default: "none",
    },
    linkId: { type: mongoose.Schema.Types.ObjectId, default: null },

    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }, // higher first
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
  },
  { timestamps: true },
);

EcomBannerSchema.index({ isActive: 1, priority: -1, createdAt: -1 });

// module.exports = mongoose.model("EcomBanner", EcomBannerSchema);
const EcomBanner = mongoose.models.EcomBanner || mongoose.model("EcomBanner", EcomBannerSchema);
export default EcomBanner;