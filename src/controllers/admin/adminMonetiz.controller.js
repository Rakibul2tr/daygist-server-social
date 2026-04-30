import Monetization from "../../models/monetization/monetization.model.js";
import User from "../../models/user/user.model.js";



export const adminListMonetization = async (req, res) => {
  try {
    // const status = req.query.status || "pending";
    const items = await Monetization.find({ })
      .sort({ createdAt: -1 })
      .populate("userId", "name username avatar email cover")
      .lean();

    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

export const adminApproveMonetization = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const appId = req.params.id;

    const app = await Monetization.findById(appId);
    if (!app)
      return res
        .status(404)
        .json({ ok: false, message: "Application not found" });

    if (app.status !== "pending") {
      return res
        .status(400)
        .json({ ok: false, message: `Already ${app.status}` });
    }

    app.status = "approved";
    app.reviewedBy = adminId;
    app.reviewedAt = new Date();
    app.rejectReason = null;
    await app.save();

    // ✅ make user monetized
    await User.findByIdAndUpdate(app.userId, {
      $set: { monetizationStatus: "approved", isMonetization: true },
    });

    return res.json({ ok: true, message: "Approved", data: app });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Approve failed" });
  }
};

export const adminRejectMonetization = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const appId = req.params.id;
    const reason = String(req.body?.reason || "").trim();

    const app = await Monetization.findById(appId);
    if (!app)
      return res
        .status(404)
        .json({ ok: false, message: "Application not found" });

    if (app.status !== "pending") {
      return res
        .status(400)
        .json({ ok: false, message: `Already ${app.status}` });
    }

    app.status = "rejected";
    app.reviewedBy = adminId;
    app.reviewedAt = new Date();
    app.rejectReason = reason || "Rejected";
    await app.save();

    await User.findByIdAndUpdate(app.userId, {
      $set: { monetizationStatus: "rejected", isMonetization: false },
    });

    return res.json({ ok: true, message: "Rejected", data: app });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Reject failed" });
  }
};
