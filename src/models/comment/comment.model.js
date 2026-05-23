// FILE: src/models/comment/comment.model.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["post", "groupPost"],
      required: true,
      index: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ reply support (parentId null => main comment)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    text: { type: String, trim: true, maxlength: 2000, required: true },

    // soft delete
    isDeleted: { type: Boolean, default: false, index: true },

    // counters (future: comment likes / reply count)
    likeCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    
    reactionCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// list comments fast
commentSchema.index({
  targetType: 1,
  postId: 1,
  parentId: 1,
  createdAt: -1,
  _id: -1,
});

const Comment =
  mongoose.models.Comment || mongoose.model("Comment", commentSchema);

export default Comment;
