// src/modules/groups/group.model.js
import mongoose from "mongoose";

const ruleSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 80 },
    text: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true },

    privacy: { type: String, enum: ["public", "private"], required: true }, // ✅ required
    coverUrl: {
      url: { type: String, default: null },
      key: { type: String, default: null },
      provider: { type: String, default: "wasabi" },
    }, // ✅ optional
    about: { type: String, trim: true, maxlength: 1000, default: "" }, // ✅ optional

    category: { type: String, trim: true, maxlength: 40, default: "" }, // ✅ optional
    location: {
      country: { type: String, trim: true, maxlength: 60, default: "" },
      city: { type: String, trim: true, maxlength: 60, default: "" },
    },

    rules: { type: [ruleSchema], default: [] },

    approval: {
      memberApprovalRequired: { type: Boolean, default: false }, // private groups এ সাধারণত true
      postApprovalRequired: { type: Boolean, default: false },
    },

    counts: {
      members: { type: Number, default: 1 }, // creator already member
      posts: { type: Number, default: 0 },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

// ✅ helper indexes
groupSchema.index({ createdBy: 1, createdAt: -1 });

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);
export default Group;
