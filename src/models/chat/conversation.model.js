import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // last message preview for inbox list
    lastMessage: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["general", "market"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected"],
      default: "requested",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // text | image | voice
    lastMessageType: {
      type: String,
      enum: ["text", "image", "voice"],
      default: "text",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // optional: total unread count for whole conversation
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Important rules:
 * - 1-to-1 chat হলে participants length always 2 হওয়া উচিত
 * - group chat না করলে max 2 enforce করা ভালো
 */
conversationSchema.pre("save", function () {
  if (!this.participants || this.participants.length !== 2) {
    throw new Error("Conversation must have exactly 2 participants");
  }
});

/**
 * Prevent duplicate 1-to-1 conversations.
 * Same 2 user আবার নতুন conversation না বানাতে.
 * Since array exact-order issue থাকতে পারে, controller-এ sorted order use করবে.
 */
conversationSchema.index({ participants: 1 });

/**
 * Inbox sorting speed
 */
conversationSchema.index({ lastMessageAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
