import mongoose from "mongoose";
import adsModel from "../../models/ads/ads.model.js";


//all get admin route
export const adminGetAds = async (req, res) => {
  try {
    const {
      status = "pending",
      search = "",
      page = 1,
      limit = 10,
    } = req.query;

    const q = {
      isDeleted: false,
      status,
    };

    if (search) {
      q.$or = [
        { title: new RegExp(search, "i") },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      adsModel.find(q)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      adsModel.countDocuments(q),
    ]);

    return res.json({
      success: true,
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load ads" });
  }
};

//admin get single ads
export const adminGetSingleAd = async (req, res) => {
  const { adId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(adId))
    return res.status(400).json({ message: "Invalid ad id" });

  const ad = await adsModel.findById(adId)
    .populate("createdBy", "name email")
    .lean();

  if (!ad) return res.status(404).json({ message: "Ad not found" });

  res.json({ success: true, item: ad });
};

//admin update ads
export const adminUpdateAd = async (req, res) => {
  const { adId } = req.params;

  const allow = ["title", "budget", "status"];
  const update = {};

  for (const k of allow) {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  }

  const saved = await adsModel.findByIdAndUpdate(
    adId,
    { $set: update },
    { new: true }
  );

  if (!saved)
    return res.status(404).json({ message: "Ad not found" });

  res.json({ success: true, item: saved });
};

//admin soft delete ads
export const adminSoftDeleteAd = async (req, res) => {
  try {
    const { adId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ message: "Invalid ad id" });
    }

    const saved = await adsModel.findByIdAndUpdate(
      adId,
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!saved) {
      return res.status(404).json({ message: "Ad not found" });
    }

    res.json({ success: true, message: "Ad deleted" });
  } catch (e) {
    res.status(500).json({ message: "Delete failed" });
  }
};


//admin hard delete ads
export const adminHardDeleteAd = async (req, res) => {
  try {
    const { adId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ message: "Invalid ad id" });
    }

    const deleted = await adsModel.findByIdAndDelete(adId);

    if (!deleted) {
      return res.status(404).json({ message: "Ad not found" });
    }

    res.json({
      success: true,
      message: "Ad permanently removed",
    });
  } catch (e) {
    res.status(500).json({ message: "Hard delete failed" });
  }
};




