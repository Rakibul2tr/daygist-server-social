// models/adView/adView.model.js

import mongoose from "mongoose";

const adViewSchema = new mongoose.Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// একই user একই ad একবারই view করবে
adViewSchema.index({ adId: 1, userId: 1 }, { unique: true });

const AdView = mongoose.models.AdView || mongoose.model("AdView", adViewSchema);

export default AdView;
