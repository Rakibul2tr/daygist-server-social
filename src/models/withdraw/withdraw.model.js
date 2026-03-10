import mongoose from "mongoose";

const WithdrawSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },

    amount: { type: Number, required: true },

    method: { type: String, enum: ["bkash", "nagad", "bank"], required: true },

    account: {
      number: { type: String, required: true },
      name: { type: String, default: null },
      bankName: { type: String, default: null },
      branch: { type: String, default: null },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
      index: true,
    },
    note: { type: String, default: null }, // admin note
  },
  { timestamps: true }
);

WithdrawSchema.index({ userId: 1, createdAt: -1, _id: -1 });


const Withdraw = mongoose.models.Withdraw || mongoose.model("Withdraw", WithdrawSchema);
export default Withdraw;