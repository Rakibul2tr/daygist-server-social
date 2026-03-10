// src/modules/groups/groupMember.model.js
import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["admin", "moderator", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["active", "requested", "invited", "blocked"],
      default: "requested",
    },
  },
  { timestamps: true }
);

// ✅ prevent duplicate membership
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

const GroupMember =
  mongoose.models.GroupMember ||
  mongoose.model("GroupMember", groupMemberSchema);

export default GroupMember;
