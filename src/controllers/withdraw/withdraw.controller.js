import mongoose from "mongoose";
import Wallet from "../../models/wallet/wallet.model.js";
import Withdraw from "../../models/withdraw/withdraw.model.js";
import { parseCursor, buildCursorFilter } from "../../utils/cursor.js";

const MIN_WITHDRAW = 500;

export const requestWithdraw = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const amount = Number(req.body?.amount || 0);
    const method = String(req.body?.method || "").toLowerCase();
    const account = req.body?.account || {};

    // const number = String(account?.number || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid amount" });
    }
    if (amount < MIN_WITHDRAW) {
      return res
        .status(400)
        .json({ ok: false, message: `Minimum withdraw is ${MIN_WITHDRAW}` });
    }
    if (!["bkash", "nagad", "bank"].includes(method)) {
      return res.status(400).json({ ok: false, message: "Invalid method" });
    }
    // if (!number) {
    //   return res
    //     .status(400)
    //     .json({ ok: false, message: "Account number required" });
    // }

    await session.withTransaction(async () => {
      // ensure wallet exists
      let wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet)wallet = await Wallet.create(
          [{ userId, available: 0, pending: 0, totalEarned: 0 }],
          { session }
        ).then((r) => r[0]);

        // console.log('wallet',wallet);
        

      if (Number(wallet.available || 0) < amount) {
        throw new Error("Insufficient balance");
      }

      // move money: available -> pending
      wallet.available = Number(wallet.available || 0) - amount;
      wallet.pending = Number(wallet.pending || 0) + amount;
      await wallet.save({ session });

      const wd = await Withdraw.create(
        [
          {
            userId,
            amount,
            method,
            account: {
              number:account,
            //   name: account?.name ? String(account.name).trim() : null,
            //   bankName: account?.bankName
            //     ? String(account.bankName).trim()
            //     : null,
            //   branch: account?.branch ? String(account.branch).trim() : null,
            },
            status: "pending",
          },
        ],
        { session }
      );

      // attach to response
      req.__wd = wd[0];
      req.__wallet = wallet;
    });

    return res.json({
      ok: true,
      message: "Withdraw requested",
      data: {
        withdraw: {
          _id: req.__wd?._id,
          status: req.__wd?.status,
          amount: req.__wd?.amount,
          method: req.__wd?.method,
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
    const msg = e?.message || "Request failed";
    const status = msg === "Insufficient balance" ? 400 : 500;
    return res.status(status).json({ ok: false, message: msg });
  } finally {
    session.endSession();
  }
};

export const getMyWithdraws = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const cursorFilter = buildCursorFilter(cursor);

    const items = await Withdraw.find({ userId, ...cursorFilter })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .select("amount method status note createdAt")
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

//all get withdraw req // admin

//widthraw actip status // admin


