import mongoose from "mongoose";

const storyViewSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
      index: true,
    },

    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// একজন user একই story একবারই view হবে
storyViewSchema.index({ storyId: 1, viewerId: 1 }, { unique: true });

export default mongoose.model("StoryView", storyViewSchema);
