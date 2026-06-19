// src/models/BoostPricing.model.js
import mongoose from "mongoose";

const BoostPricingSchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      enum: ["basic", "regular", "pro"],
      required: true,
      unique: true,
      lowercase: true,
    },

    defaultDays: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "BDT",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const BoostPricing = mongoose.model("BoostPricing", BoostPricingSchema);
export default BoostPricing;
