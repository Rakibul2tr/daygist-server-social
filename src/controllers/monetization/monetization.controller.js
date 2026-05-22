import Monetization from "../../models/monetization/monetization.model.js";
import User from "../../models/user/user.model.js";
import Wallet from "../../models/wallet/wallet.model.js";
import Withdraw from "../../models/withdraw/withdraw.model.js";
import uploadToWasabi from "../../services/wbUpload.service.js";

export const applyMonetization = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    let fullAddressObj = null;
    try {
      fullAddressObj = JSON.parse(req.body.fullAddress || "{}");
    } catch {}

    if (!fullAddressObj)
      return res
        .status(400)
        .json({ ok: false, message: "fullAddress missing" });

    const front = req.files?.nidFront?.[0];
    const back = req.files?.nidBack?.[0];
    if (!front || !back)
      return res
        .status(400)
        .json({ ok: false, message: "nidFront & nidBack required" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });

    if (user.isMonetization || user.monetizationStatus === "approved") {
      return res.status(400).json({ ok: false, message: "Already monetized" });
    }

    const pending = await Monetization.findOne({
      userId,
      status: "pending",
    });
    if (pending) {
      return res
        .status(400)
        .json({ ok: false, message: "Already applied. Please wait." });
    }

    const upFront = await uploadToWasabi({
      buffer: front.buffer,
      mimetype: front.mimetype,
      originalname: front.originalname,
      folder: "nid",
    });

    const upBack = await uploadToWasabi({
      buffer: back.buffer,
      mimetype: back.mimetype,
      originalname: back.originalname,
      folder: "nid",
    });

    const app = await Monetization.create({
      userId,
      fullAddress: fullAddressObj,
      nidFront: { url: upFront.url, key: upFront.key, provider: "wasabi" },
      nidBack: { url: upBack.url, key: upBack.key, provider: "wasabi" },
      status: "pending",
    });

    // ✅ update user status only
    user.monetizationStatus = "pending";
    await user.save();

    return res.json({ ok: true, message: "Applied", data: app });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || "Apply failed" });
  }
};

export const getMyMonetization = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    // user minimal fields
    const user = await User.findById(userId)
      .select("isMonetization monetizationStatus")
      .lean();
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });
    const app = await Monetization.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();


      // console.log('app',app);
      

    // wallet auto create if missing
    let wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) {
      const created = await Wallet.create({
        userId,
        available: 0,
        pending: 0,
        totalEarned: 0,
      });
      wallet = created.toObject();
    }

    const lastWithdraw = await Withdraw.findOne({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .select("status amount createdAt")
      .lean();

    return res.json({
      ok: true,
      data:
        {
          user: {
            isMonetization: !!user.isMonetization,
            monetizationStatus: user.monetizationStatus || "none",
          },
          wallet: {
            available: Number(wallet.available || 0),
            pending: Number(wallet.pending || 0),
            totalEarned: Number(wallet.totalEarned || 0),
          },
          lastWithdraw: lastWithdraw || null,
          app,
        } || null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

// export const adminListMonetization = async (req, res) => {
//   try {
//     const status = req.query.status || "pending";
//     const items = await Monetization.find({ status })
//       .sort({ createdAt: -1 })
//       .populate("userId", "name username avatar email")
//       .lean();

//     return res.json({ ok: true, items });
//   } catch (e) {
//     return res.status(500).json({ ok: false, message: e?.message || "Failed" });
//   }
// };

// export const adminApproveMonetization = async (req, res) => {
//   try {
//     const adminId = req.user?._id;
//     const appId = req.params.id;

//     const app = await Monetization.findById(appId);
//     if (!app)
//       return res
//         .status(404)
//         .json({ ok: false, message: "Application not found" });

//     if (app.status !== "pending") {
//       return res
//         .status(400)
//         .json({ ok: false, message: `Already ${app.status}` });
//     }

//     app.status = "approved";
//     app.reviewedBy = adminId;
//     app.reviewedAt = new Date();
//     app.rejectReason = null;
//     await app.save();

//     // ✅ make user monetized
//     await User.findByIdAndUpdate(app.userId, {
//       $set: { monetizationStatus: "approved", isMonetization: true },
//     });

//     return res.json({ ok: true, message: "Approved", data: app });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ ok: false, message: e?.message || "Approve failed" });
//   }
// };

// export const adminRejectMonetization = async (req, res) => {
//   try {
//     const adminId = req.user?._id;
//     const appId = req.params.id;
//     const reason = String(req.body?.reason || "").trim();

//     const app = await Monetization.findById(appId);
//     if (!app)
//       return res
//         .status(404)
//         .json({ ok: false, message: "Application not found" });

//     if (app.status !== "pending") {
//       return res
//         .status(400)
//         .json({ ok: false, message: `Already ${app.status}` });
//     }

//     app.status = "rejected";
//     app.reviewedBy = adminId;
//     app.reviewedAt = new Date();
//     app.rejectReason = reason || "Rejected";
//     await app.save();

//     await User.findByIdAndUpdate(app.userId, {
//       $set: { monetizationStatus: "rejected", isMonetization: false },
//     });

//     return res.json({ ok: true, message: "Rejected", data: app });
//   } catch (e) {
//     return res
//       .status(500)
//       .json({ ok: false, message: e?.message || "Reject failed" });
//   }
// };
