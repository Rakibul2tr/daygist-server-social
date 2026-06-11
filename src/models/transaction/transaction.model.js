import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["own", "other", "withdraw"], // আপনার ৩টি মোড
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    // Other FB User মোডের জন্য
    reference: {
      type: String,
      default: null,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Withdraw মোডের জন্য
    method: {
      type: String,
      enum: ["bkash", "nagad", "bank"],
      default: null,
    },
    accountNumber: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending", // উইথড্রর জন্য পেন্ডিং থাকবে, ওন/আদারে ডিরেক্ট কমপ্লিট হতে পারে
    },
  },
  { timestamps: true },
);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
export default Transaction;
