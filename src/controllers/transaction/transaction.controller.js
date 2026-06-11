import mongoose from "mongoose";
import User from "../../models/user/user.model.js";
import Transaction from "../../models/transaction/transaction.model.js";
import Wallet from "../../models/wallet/wallet.model.js";

export const manageBalance = async (req, res) => {
  try {
    const { type, amount, reference, targetUserId, method, accountNumber } =
      req.body;
    const userId = req.user.id; // অথেনটিকেশন মিডলওয়্যার থেকে প্রাপ্ত ইউজার আইডি

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    // কারেন্ট ইউজারের ব্যালেন্স চেক করা
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const currentWallet = await Wallet.findOne({ userId });
    if (!currentWallet) {
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found for this user" });
    }

    // ১. Own FB Balance মোড
    if (type === "own") {
      if (currentWallet.available < amountNum) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet available balance",
        });
      }
      currentWallet.available -= amountNum;
      currentUser.balance += amountNum;
       await currentWallet.save();
       await currentUser.save();

      const transaction = await Transaction.create({
        userId,
        type,
        amount: amountNum,
        status: "completed",
      });

      return res.status(200).json({
        success: true,
        message: "Balance added to own wallet",
        transaction,
        currentBalance: currentUser.balance,
        walletAvailable: currentWallet.available,
      });
    }

    // ২. Other FB User মোড (টাকা ট্রান্সফার)
    if (type === "other") {
      if (!targetUserId) {
        return res
          .status(400)
          .json({ success: false, message: "Target user is required" });
      }
      if (currentWallet.available < amountNum) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet available balance",
        });
      }
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, message: "Target user not found" });
      }

      if (targetUser.balance === undefined) targetUser.balance = 0;
    

      // ব্যালেন্স আদান-প্রদান
      currentWallet.available -= amountNum;
      targetUser.balance += amountNum;

      await currentWallet.save();
      await targetUser.save();

      const transaction = await Transaction.create({
        userId,
        type,
        amount: amountNum,
        reference,
        targetUserId,
        status: "completed",
      });

      return res.status(200).json({
        success: true,
        message: "Transferred successfully",
        transaction,
        walletAvailable: currentWallet.available,
      });
    }

    // ৩. Withdraw মোড
    if (type === "withdraw") {
      const minWithdraw = 100;
      if (amountNum < minWithdraw) {
        return res.status(400).json({
          success: false,
          message: `Minimum withdraw is ৳${minWithdraw}`,
        });
      }
       if (currentWallet.available < amountNum) {
         return res
           .status(400)
           .json({
             success: false,
             message: "Insufficient wallet available balance",
           });
       }
      if (!method || !accountNumber) {
        return res.status(400).json({
          success: false,
          message: "Method and account number are required",
        });
      }

      // উইথড্র রিকোয়েস্ট তৈরি করা এবং মেইন ব্যালেন্স থেকে কেটে নেওয়া (বা হোল্ড করা)
      currentWallet.available -= amountNum;
      await currentWallet.save();

      const transaction = await Transaction.create({
        userId,
        type,
        amount: amountNum,
        method,
        accountNumber,
        status: "pending", // এডমিন প্যানেল থেকে অ্যাপ্রুভ করার জন্য পেন্ডিং থাকবে
      });

      return res.status(200).json({
        success: true,
        message: "Withdraw request submitted successfully",
        transaction,
        walletAvailable: currentWallet.available,
      });
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid screen mode type" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get user transaction history
// @route   GET /api/balance/history
// @access  Private
export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .populate("targetUserId", "name email");
    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({
      success: false,
      message: "Server Error. Could not fetch history.",
    });
  }
};
