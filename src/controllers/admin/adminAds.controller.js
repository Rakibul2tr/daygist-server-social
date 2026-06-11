import mongoose from "mongoose";
import Ad from "../../models/ads/ad.model.js"; // সঠিক পাথ দিন
import { deleteManyFromWasabi } from "../../services/wbUpload.service.js";

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
   const userId = req.user?._id;
   if(!userId)return res.json({ success: false, message: "user not found" });
    const query = { status: "active" };

    const ads = await Ad.find(query).sort({ createdAt: -1 });
    // console.log('ads',ads);
    
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

export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;

    // ১. অবজেক্ট আইডি ভ্যালিডেশন
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    // ২. ডাটাবেস থেকে আগে অ্যাডটি খুঁজে বের করুন (কী রিমুভ করার জন্য ডাটা লাগবে)
    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    // ৩. ✅ যদি অ্যাডের ভেতর মিডিয়া অবজেক্ট এবং Wasabi Key থাকে তবে সেটি স্টোরেজ থেকে ডিলিট করবে
    if (ad.media && ad.media.key) {
      try {
        // আপনার মেথডটি যেহেতু অ্যারে রিসিভ করে (deleteMany), তাই কী-টি অ্যারে আকারে পাঠানো হলো
        const keys = [ad.media.key];

        console.log("Attempting to delete media from Wasabi:", keys);
        const out = await deleteManyFromWasabi(keys);
        console.log("Wasabi delete response:", out);
      } catch (wasabiError) {
        // কোনো কারণে ওয়াসাবি থেকে ডিলিট ফেল করলেও যেন ডাটাবেস প্রসেস না আটকায় তার জন্য লগ রাখা হলো
        console.error(
          "Failed to delete media from Wasabi storage:",
          wasabiError.message,
        );
      }
    }

    // ৪. এখন ডাটাবেস থেকে বিজ্ঞাপনের ডকুমেন্টটি চিরতরে মুছে ফেলুন
    await Ad.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Ad and its media permanently deleted",
    });
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



export const updateAdStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 
    

    // ১. অবজেক্ট আইডি ভ্যালিডেশন
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    // ২. স্ট্যাটাস ভ্যালু ভ্যালিডেশন
    const validStatuses = ["active", "paused", "expired"];
    if (!status || !validStatuses.includes(status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid status value. Use 'active' or 'inactive'.",
        });
    }

    // ৩. ডাটাবেসে স্ট্যাটাস আপডেট করা
    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { $set: { status: status } },
      { new: true, runValidators: true }, // নতুন আপডেট হওয়া ডাটা রিটার্ন করবে এবং স্কিমা ভ্যালিডেশন চেক করবে
    );

    if (!updatedAd) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Ad status successfully updated to ${status}`,
      data: updatedAd,
    });
  } catch (error) {
    console.error("Error updating ad status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

