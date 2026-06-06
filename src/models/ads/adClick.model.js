// models/AdClick.js

import mongoose from "mongoose";

const adClickSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },

    videoAuthor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    clickedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    coinEarned: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

const AdClick =
  mongoose.models.AdClick || mongoose.model("AdClick", adClickSchema);

export default AdClick;
