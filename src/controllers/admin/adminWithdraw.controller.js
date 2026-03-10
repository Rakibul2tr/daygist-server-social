import mongoose from "mongoose";
import Wallet from "../../models/wallet/wallet.model.js";
import Withdraw from "../../models/withdraw/withdraw.model.js";
import { parseCursor, buildCursorFilter } from "../../utils/cursor.js";


export const adminGetAllWithdraws = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const status = req.query.status ? String(req.query.status) : null;
    // status: pending | approved | rejected (optional)

    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const filter = { ...cursorFilter };
    if (status) filter.status = status;

    const items = await Withdraw.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      // user info লাগলে populate দিন (আপনার schema অনুযায়ী path ঠিক করবেন)
      .populate("userId", "name username profilePic uid")
      .select("userId amount method status note account createdAt")
      .lean();

    const nextCursor =
      items.length > 0
        ? {
            createdAt: items[items.length - 1].createdAt,
            _id: items[items.length - 1]._id,
          }
        : null;

    return res.json({ ok: true, items, nextCursor });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Failed" });
  }
};

export const adminApproveWithdraw = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const adminId = req.user?._id;
    const withdrawId = req.params?.id;

    if (!withdrawId) {
      return res
        .status(400)
        .json({ ok: false, message: "Withdraw id required" });
    }

    const note = req.body?.note ? String(req.body.note).trim() : "";

    await session.withTransaction(async () => {
      const wd = await Withdraw.findById(withdrawId).session(session);
      if (!wd) throw new Error("Withdraw not found");

      if (wd.status !== "pending") {
        throw new Error("Only pending withdraw can be approved");
      }

      const userId = wd.userId;

      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) throw new Error("Wallet not found");

      const amount = Number(wd.amount || 0);

      // ✅ pending must have enough
      if (Number(wallet.pending || 0) < amount) {
        throw new Error("Wallet pending insufficient");
      }

      // ✅ payout done: pending decreases
      wallet.pending = Number(wallet.pending || 0) - amount;
      await wallet.save({ session });

      // ✅ update withdraw status
      wd.status = "approved";
      if (note) wd.note = note;

      // যদি আপনার Withdraw schema-তে থাকে, রাখবেন:
      // wd.reviewedBy = adminId;
      // wd.reviewedAt = new Date();

      await wd.save({ session });

      req.__wd = wd;
      req.__wallet = wallet;
    });

    return res.json({
      ok: true,
      message: "Withdraw approved",
      data: {
        withdraw: {
          _id: req.__wd?._id,
          status: req.__wd?.status,
          amount: req.__wd?.amount,
          method: req.__wd?.method,
          note: req.__wd?.note || null,
          createdAt: req.__wd?.createdAt,
        },
        wallet: {
          available: Number(req.__wallet?.available || 0),
          pending: Number(req.__wallet?.pending || 0),
          totalEarned: Number(req.__wallet?.totalEarned || 0),
        },
      },
    });
  } catch (e) {
    const msg = e?.message || "Approve failed";
    const status =
      msg === "Withdraw not found"
        ? 404
        : msg.includes("pending")
          ? 400
          : msg.includes("Wallet")
            ? 400
            : 500;

    return res.status(status).json({ ok: false, message: msg });
  } finally {
    session.endSession();
  }
};

export const adminRejectWithdraw = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const adminId = req.user?._id;
    const withdrawId = req.params?.id;

    if (!withdrawId) {
      return res
        .status(400)
        .json({ ok: false, message: "Withdraw id required" });
    }

    const note = req.body?.note ? String(req.body.note).trim() : "";
    if (!note) {
      return res
        .status(400)
        .json({ ok: false, message: "Reject note required" });
    }

    await session.withTransaction(async () => {
      const wd = await Withdraw.findById(withdrawId).session(session);
      if (!wd) throw new Error("Withdraw not found");

      if (wd.status !== "pending") {
        throw new Error("Only pending withdraw can be rejected");
      }

      const userId = wd.userId;
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) throw new Error("Wallet not found");

      const amount = Number(wd.amount || 0);

      // ✅ pending must have enough
      if (Number(wallet.pending || 0) < amount) {
        throw new Error("Wallet pending insufficient");
      }

      // ✅ return money: pending -> available
      wallet.pending = Number(wallet.pending || 0) - amount;
      wallet.available = Number(wallet.available || 0) + amount;
      await wallet.save({ session });

      wd.status = "rejected";
      wd.note = note;

      // যদি আপনার Withdraw schema-তে থাকে:
      // wd.reviewedBy = adminId;
      // wd.reviewedAt = new Date();

      await wd.save({ session });

      req.__wd = wd;
      req.__wallet = wallet;
    });

    return res.json({
      ok: true,
      message: "Withdraw rejected",
      data: {
        withdraw: {
          _id: req.__wd?._id,
          status: req.__wd?.status,
          amount: req.__wd?.amount,
          method: req.__wd?.method,
          note: req.__wd?.note || null,
          createdAt: req.__wd?.createdAt,
        },
        wallet: {
          available: Number(req.__wallet?.available || 0),
          pending: Number(req.__wallet?.pending || 0),
          totalEarned: Number(req.__wallet?.totalEarned || 0),
        },
      },
    });
  } catch (e) {
    const msg = e?.message || "Reject failed";
    const status =
      msg === "Withdraw not found"
        ? 404
        : msg.includes("pending")
          ? 400
          : msg.includes("Wallet")
            ? 400
            : 500;

    return res.status(status).json({ ok: false, message: msg });
  } finally {
    session.endSession();
  }
};
