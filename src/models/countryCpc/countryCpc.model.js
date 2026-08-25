// models/countryCpc/countryCpc.model.js

import mongoose from "mongoose";

const countryCpcSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
    },

    flag: {
      type: String,
      default: "",
    },

    cpc: {
      daygist: {
        type: Number,
        default: 0,
        min: 0,
      },
      others: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const CountryCpc =
  mongoose.models.CountryCpc || mongoose.model("CountryCpc", countryCpcSchema);

export default CountryCpc;
