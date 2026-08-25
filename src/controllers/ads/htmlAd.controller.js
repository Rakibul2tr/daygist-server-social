
import mongoose from "mongoose";
import HtmlAd from '../../models/ads/htmlAd.model.js' 

// ১. নতুন HTML বিজ্ঞাপন তৈরি (Create)
export const createAd = async (req, res) => {
  try {
    const { title, html_code } = req.body;

    if (!title || !html_code) {
      return res
        .status(400)
        .json({ success: false, message: "Title and HTML code are required" });
    }

    const newAd = await HtmlAd.create({ title, html_code });

    res
      .status(201)
      .json({ success: true, message: "Ad created successfully", data: newAd });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ২. সব বিজ্ঞাপন একসাথে আনা - অ্যাপ এবং অ্যাডমিন প্যানেল উভয়ের জন্য (Read All)
export const getAllAds = async (req, res) => {
  try {
    // শুধুমাত্র অ্যাক্টিভ বিজ্ঞাপনগুলো অ্যাপে দেখানোর জন্য কন্ডিশন রাখা যেতে পারে
    const ads = await HtmlAd.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: ads.length, data: ads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৩. নির্দিষ্ট একটি বিজ্ঞাপন আইডি দিয়ে খোঁজা (Read Single)
export const getAdById = async (req, res) => {
  try {
    const ad = await HtmlAd.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }
    res.status(200).json({ success: true, data: ad });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৪. বিজ্ঞাপন আপডেট করা (Update)
export const updateAd = async (req, res) => {
  try {
    const { title, html_code, isActive } = req.body;

    const updatedAd = await HtmlAd.findByIdAndUpdate(
      req.params.id,
      { title, html_code, isActive },
      { new: true, runValidators: true },
    );

    if (!updatedAd) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Ad updated successfully",
        data: updatedAd,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ৫. বিজ্ঞাপন ডিলিট করা (Delete)
export const deleteAd = async (req, res) => {
  try {
    const deletedAd = await HtmlAd.findByIdAndDelete(req.params.id);

    if (!deletedAd) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    res.status(200).json({ success: true, message: "Ad deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
