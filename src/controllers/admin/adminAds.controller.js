import mongoose from "mongoose";
import Ad from "../../models/ads/ad.model.js"; // সঠিক পাথ দিন

// 🟢 ১. বিজ্ঞাপন তৈরি করা (Create Ad)
export const createAd = async (req, res) => {
  try {
    const {
      title,
      description,
      adType,
      media,
      thumbnail,
      placement,
      ctaLink,
      ctaText,
      duration,
      isSkippable,
      skipAfter,
      startDate,
      endDate,
    } = req.body;

    // ভ্যালিডেশন
    if (!title || !adType || !media || !media.url || !media.key) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const newAd = await Ad.create({
      title,
      description,
      adType,
      media,
      thumbnail,
      placement,
      ctaLink,
      ctaText,
      duration,
      isSkippable,
      skipAfter,
      startDate,
      endDate,
    });

    return res
      .status(201)
      .json({ success: true, message: "Ad created successfully", data: newAd });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to create ad",
      });
  }
};

// 🔵 ২. সব বিজ্ঞাপন লিস্ট দেখা (Get All Ads - Admin Panel এর জন্য)
export const getAllAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: ads });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔵 ৩. অ্যাপের ফ্রন্টএন্ড ফিডের জন্য অ্যাক্টিভ বিজ্ঞাপন আনা (Get Active Ads for App)
export const getActiveAds = async (req, res) => {
  try {
    const { placement } = req.query; // home_feed | post_details | popup

    const query = { status: "active" };
    if (placement) query.placement = placement;

    const ads = await Ad.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data: ads });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🟡 ৪. বিজ্ঞাপন আপডেট করা (Update Ad)
export const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true },
    );
    if (!updatedAd)
      return res.status(404).json({ success: false, message: "Ad not found" });

    return res.json({
      success: true,
      message: "Ad updated successfully",
      data: updatedAd,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔴 ৫. বিজ্ঞাপন ডিলিট করা (Delete Ad)
export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    const deletedAd = await Ad.findByIdAndDelete(id);
    if (!deletedAd)
      return res.status(404).json({ success: false, message: "Ad not found" });

    return res.json({ success: true, message: "Ad deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 📊 𝖹. বিজ্ঞাপনের ইমপ্রেশন ও ক্লিক ট্র্যাক করা (Track Analytics)
export const trackAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.query; // action can be 'impression' or 'click'

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    let update = {};
    if (action === "impression") update = { $inc: { impressions: 1 } };
    else if (action === "click") update = { $inc: { clicks: 1 } };
    else
      return res
        .status(400)
        .json({ success: false, message: "Invalid action type" });

    await Ad.findByIdAndUpdate(id, update);
    return res.json({
      success: true,
      message: `Ad ${action} tracked successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
