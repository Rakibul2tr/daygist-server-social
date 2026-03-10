import mongoose from "mongoose";

const storyMediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    key: { type: String, default: "" }, // ✅ wasabi key / cloudinary public_id
    provider: { type: String, default: "wasabi" }, // wasabi|cloudinary
    thumbnailUrl: { type: String, default: "" }, // ✅ video thumb
    width: Number,
    height: Number,
    durationSec: Number,
  },
  { _id: false }
);

const storyTextStyleSchema = new mongoose.Schema(
  {
    color: String,
    fontSize: Number,
    fontWeight: String,
    align: { type: String, enum: ["left", "center"], default: "center" },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },

    type: {
      type: String,
      enum: ["image", "video", "text"],
      required: true,
      index: true,
    },

    privacy: {
      type: String,
      enum: ["public", "friends", "only_me"],
      default: "public",
      index: true,
    },

    // ✅ image/video
    media: { type: storyMediaSchema, default: null },

    // ✅ text story
    text: { type: String, trim: true, maxlength: 3000, default: "" },
    backgroundUrl: { type: String, default: "" },
    textStyle: { type: storyTextStyleSchema, default: null },

    // soft delete (optional)
    isDeleted: { type: Boolean, default: false, index: true },

    // ✅ TTL
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// ✅ TTL index: expiresAt time এ doc auto delete
// storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// query speed
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ createdAt: -1, _id: -1 });

const Story = mongoose.models.Story || mongoose.model("Story", storySchema);
export default Story;
