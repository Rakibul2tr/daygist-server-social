// controllers/adView.controller.js

import mongoose from "mongoose";
import AdView from "../../models/ads/adView.model.js";
import Ad from "../../models/ads/ad.model.js";

export const recordAdView = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { adId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.isValidObjectId(adId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ad ID",
      });
    }

    const ad = await Ad.findById(adId).select("_id");

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    // আগে দেখা হয়েছে কিনা
    const existingView = await AdView.findOne({
      adId,
      userId,
    });

    if (existingView) {
      return res.json({
        success: true,
        counted: false,
        alreadyViewed: true,
        message: "Ad already viewed",
      });
    }

    // নতুন view create
    const view = await AdView.create({
      adId,
      userId,
    });

    // Ad impression +1
    await Ad.findByIdAndUpdate(adId, {
      $inc: {
        impressions: 1,
      },
    });

    return res.status(201).json({
      success: true,
      counted: true,
      alreadyViewed: false,
      data: view,
      message: "Ad view recorded successfully",
    });
  } catch (error) {
    // Unique index race condition হলে duplicate count হবে না
    if (error?.code === 11000) {
      return res.json({
        success: true,
        counted: false,
        alreadyViewed: true,
        message: "Ad already viewed",
      });
    }

    console.error("recordAdView:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record ad view",
    });
  }
};
