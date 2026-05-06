import mongoose from "mongoose";
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },

    type: {
      type: String,
      enum: ["post_comment", "comment_reply", "group_post_comment"],
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    body: { type: String, required: true },

    data: { type: Schema.Types.Mixed, default: {} }, // {postId, commentId, ...}
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

NotificationSchema.index({ toUserId: 1, createdAt: -1 });

const Notification= mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);

  export default Notification
