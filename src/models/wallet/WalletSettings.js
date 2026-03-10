import mongoose from "mongoose";

const { Schema, models } = mongoose;

const WalletSettingsSchema = new Schema(
  {
    wallet_enabled: { type: Boolean, default: false },
    transfer_enabled: { type: Boolean, default: false },
    withdraw_enabled: { type: Boolean, default: false },

    max_transfer_amount: { type: Number, default: 0 },
    min_withdraw_amount: { type: Number, default: 0 },

    payment_methods: {
      paypal: { type: Boolean, default: false },
      skrill: { type: Boolean, default: false },
      bank: { type: Boolean, default: false },
      custom: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const WalletSettings =
  models.WalletSettings ||
  mongoose.model("WalletSettings", WalletSettingsSchema);

export default WalletSettings;
