// FILE: src/models/post/post.model.js
import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                                  SubSchemas                                */
/* -------------------------------------------------------------------------- */

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["cloudinary", "wasabi", "s3", "local"],
      default: "wasabi",
    },

    publicId: { type: String, default: null },
    key: { type: String, default: null },

    thumbnailUrl: { type: String, default: null },
    thumbnailKey: { type: String, default: null }, // ✅ added

    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null },
  },
  { _id: false },
);

const textStyleSchema = new mongoose.Schema(
  {
    color: { type: String, default: null },
    fontSize: { type: Number, default: null },
    fontWeight: { type: String, default: null },
    align: { type: String, enum: ["left", "center"], default: "center" },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/*                                   Post Schema                               */
/* -------------------------------------------------------------------------- */

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ post content type
    type: {
      type: String,
      enum: ["text", "image", "video"],
      required: true,
      index: true,
    },

    privacy: {
      type: String,
      enum: ["public", "friends", "only_me"],
      default: "public",
      index: true,
    },

    // ✅ caption/text (single field)
    text: { type: String, trim: true, maxlength: 5000, default: "" },
    description: { type: String, trim: true, maxlength: 5000, default: "" },

    // ✅ text post extras
    backgroundUrl: { type: String, default: null },
    feeling: { type: String, default: null },
    textStyle: { type: textStyleSchema, default: null },

    // ✅ media posts
    medias: { type: [mediaSchema], default: [] },

    layout: {
      type: String,
      enum: ["single", "grid2", "grid3", "carousel"],
      default: null,
    },

    /* ----------------------------- Video behaviour ---------------------------- */
    mutedByDefault: { type: Boolean, default: true },
    loop: { type: Boolean, default: false },

    // ✅ "normal" | "reels" | "live"
    videoMode: {
      type: String,
      enum: ["normal", "reels", "live"],
      default: "normal",
      index: true,
    },

    // ✅ category helps filtering (timeline/photos/reels)
    category: {
      type: String,
      enum: ["general", "reels"],
      default: "general",
      index: true,
    },
    subCategory: { type: String, default: "other", index: true },

    /* ------------------------------ Soft delete ------------------------------ */
    isDeleted: { type: Boolean, default: false, index: true },

    /* -------------------------------- Counters ------------------------------ */
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/*                                    Indexes                                 */
/* -------------------------------------------------------------------------- */

// feed/timeline sorting
postSchema.index({ createdAt: -1, _id: -1 });

// user timeline quickly
postSchema.index({ author: 1, createdAt: -1 });

// filters
postSchema.index({ author: 1, type: 1, createdAt: -1 });
postSchema.index({ author: 1, category: 1, createdAt: -1 });
postSchema.index({
  text: "text",
  description: "text",
  category: "text",
  subCategory: "text",
});

/* -------------------------------------------------------------------------- */

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
export default Post;
