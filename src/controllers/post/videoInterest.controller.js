// src/controllers/video/videoInterest.controller.js
import mongoose from "mongoose";
import VideoInterest from "../../models/post/videoInterest.model.js";

export const trackVideoInterest = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const postId = req.body?.postId; // optional (analytics)
    const category = String(req.body?.category || "").trim();
    const subCategory = String(req.body?.subCategory || "").trim();
    const watchedSec = Number(req.body?.watchedSec || 0);

    if (!category)
      return res
        .status(400)
        .json({ success: false, message: "category required" });

    // ✅ only count interest if meaningful watch time (you want 3 min)
    if (watchedSec < 180) {
      return res.json({
        success: true,
        message: "ignored (watchedSec too low)",
      });
    }

    await VideoInterest.updateOne(
      {
        userId: new mongoose.Types.ObjectId(userId),
        category,
        subCategory,
      },
      {
        $inc: { score: 1 },
        $set: { lastWatchedAt: new Date() },
      },
      { upsert: true },
    );

    return res.json({ success: true, message: "interest tracked" });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e?.message || "track interest failed" });
  }
};
