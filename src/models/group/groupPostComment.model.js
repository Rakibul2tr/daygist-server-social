import mongoose from "mongoose";

const { Schema } = mongoose;

const GroupPostCommentSchema = new Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupPost",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    text: { type: String, required: true, trim: true },

    // ✅ reply support (optional)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupPostComment",
      default: null,
      index: true,
    },

    // moderation
    isDeleted: { type: Boolean, default: false, index: true },
    editedAt: { type: Date },
  },
  { timestamps: true },
);

GroupPostCommentSchema.index({ postId: 1, createdAt: -1, _id: -1 });

const GroupPostComment =
  mongoose.models.GroupPostComment ||
  mongoose.model("GroupPostComment", GroupPostCommentSchema);

export default GroupPostComment;
