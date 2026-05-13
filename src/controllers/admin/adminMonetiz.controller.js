import { log } from "console";
import Monetization from "../../models/monetization/monetization.model.js";
import User from "../../models/user/user.model.js";



export const adminListMonetization = async (req, res) => {
  
  try {
     const status = req.query.status;

     // একটি খালি অবজেক্ট তৈরি করুন
     let filter = {};

     // যদি status থাকে, তবে ফিল্টার অবজেক্টে সেটি যোগ করুন
     if (status) {
       filter.status = status;
     }
    
    const items = await Monetization.find( filter )
      .sort({ createdAt: -1 })
      .populate("userId", "name username avatar email cover")
      .lean();

    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

export const getSingleMonetization = async (req, res) => {
  try {
    const { id } = req.params; // ইউআরএল থেকে আইডি নিবে

    const item = await Monetization.findById(id)
      .populate("userId", "name username avatar email cover")
      .lean();

    if (!item) {
      return res.status(404).json({
        ok: false,
        message: "Monetization request not found",
      });
    }

    return res.status(200).json({
      ok: true,
      data: item,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "Internal server error",
    });
  }
};


export const adminMonetizationStatus = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const appId = req.params.id;
    // ✅ ফ্রন্টএন্ড বডি থেকে স্ট্যাটাস এবং রিজেক্ট রিজন নিন
    const { status, rejectReason } = req.body;

    // ভ্যালিডেশন চেক
    const validStatuses = ["approved", "pending", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid status provided" });
    }

    const app = await Monetization.findById(appId);
    if (!app) {
      return res
        .status(404)
        .json({ ok: false, message: "Application not found" });
    }

    // অলরেডি সেম স্ট্যাটাস থাকলে এরর রিটার্ন করবে
    if (app.status === status) {
      return res
        .status(400)
        .json({ ok: false, message: `Application is already ${status}` });
    }

    // ✅ ডাইনামিক স্ট্যাটাস আপডেট
    app.status = status;
    app.reviewedBy = adminId;
    app.reviewedAt = new Date();
    app.rejectReason =
      status === "rejected" ? rejectReason || "Rejected by admin" : null;
    await app.save();

    // ✅ ইউজারের মনিটাইজেশন প্রোফাইল স্ট্যাটাস সিঙ্ক করা
    const isMonetized = status === "approved";
    await User.findByIdAndUpdate(app.userId, {
      $set: {
        monetizationStatus: status, // approved, pending, rejected
        isMonetization: isMonetized, // true বা false হবে
      },
    });

    return res.json({
      ok: true,
      message: `Status updated to ${status}`,
      data: app,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Status update failed" });
  }
};



