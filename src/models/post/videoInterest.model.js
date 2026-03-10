// src/models/video/videoInterest.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const VideoInterestSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, default: "", index: true },

    score: { type: Number, default: 0 },
    lastWatchedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

// same user + same category + same subCategory -> single row
VideoInterestSchema.index(
  { userId: 1, category: 1, subCategory: 1 },
  { unique: true },
);

const VideoInterest =
  mongoose.models.VideoInterest ||
  mongoose.model("VideoInterest", VideoInterestSchema);

export default VideoInterest;
