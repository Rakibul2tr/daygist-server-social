import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      index: true,
      required: true,
    },

    available: { type: Number, default: 0 }, // withdrawable
    pending: { type: Number, default: 0 }, // processing
    totalEarned: { type: Number, default: 0 }, // lifetime earned
  },
  { timestamps: true }
);
const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
export default Wallet;