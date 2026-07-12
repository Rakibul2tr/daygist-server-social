import mongoose from "mongoose";

const storyReactionSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reaction: {
      type: String,
      enum: ["like", "love", "haha", "wow", "sad", "angry", "fire"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// একজন user একটি story-তে একটিই reaction রাখতে পারবে
storyReactionSchema.index({ storyId: 1, userId: 1 }, { unique: true });

export default mongoose.model("StoryReaction", storyReactionSchema);
