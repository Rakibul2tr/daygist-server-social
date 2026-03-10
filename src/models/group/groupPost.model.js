import mongoose from "mongoose";

const { Schema } = mongoose;

const MediaRefSchema = new Schema(
  {
    url: { type: String, required: true },
    provider: { type: String, enum: ["wasabi", "cloudinary"], required: true },
    key: { type: String, required: true },
  },
  { _id: false },
);

const TextStyleSchema = new Schema(
  {
    color: { type: String },
    fontSize: { type: Number },
    fontWeight: { type: String },
    align: { type: String, enum: ["left", "center", "right"] },
  },
  { _id: false },
);

const GroupPostSchema = new Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ same as your normal post
    type: { type: String, enum: ["text", "image", "video"], required: true },

    // text
    text: { type: String },
    backgroundUrl: { type: String },
    textStyle: { type: TextStyleSchema },

    // image
    caption: { type: String },
    images: { type: [MediaRefSchema], default: [] }, // [{url,provider,key}]
    layout: { type: String, enum: ["single", "carousel"], default: "single" },

    // video
    video: {
      url: { type: String },
      thumbnailUrl: { type: String },
      provider: { type: String, enum: ["wasabi", "cloudinary"] },
      key: { type: String },
    },
    mutedByDefault: { type: Boolean, default: true },
    loop: { type: Boolean, default: false },

    // reels style optional
    category: { type: String, default: "group" },
    subCategory: { type: String },

    // moderation
    isDeleted: { type: Boolean, default: false, index: true },
    editedAt: { type: Date },

    // counts (optional)
    counts: {
      likeCount: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
      shareCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

GroupPostSchema.index({ groupId: 1, createdAt: -1, _id: -1 });

 const GroupPost =mongoose.models.GroupPost || mongoose.model("GroupPost", GroupPostSchema);
export default GroupPost;