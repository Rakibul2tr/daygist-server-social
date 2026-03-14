import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
    provider: {
      type: String,
      default: "wasabi",
      trim: true,
    },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    text: {
      type: String,
      default: "",
      trim: true,
    },

    messageType: {
      type: String,
      enum: ["text", "image", "voice"],
      default: "text",
      required: true,
    },

    // ✅ Wasabi-style media object
    media: {
      type: mediaSchema,
      default: () => ({
        key: "",
        url: "",
        provider: "",
      }),
    },

    mediaMeta: {
      duration: { type: Number, default: 0 },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: "" },
    },

    seen: {
      type: Boolean,
      default: false,
      index: true,
    },

    delivered: {
      type: Boolean,
      default: false,
    },

    seenAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.pre("validate", function () {
  if (this.messageType === "text") {
    if (!this.text || !String(this.text).trim()) {
      throw new Error("Text message must contain text");
    }
  }

  if (this.messageType === "image" || this.messageType === "voice") {
    if (!this.media?.url || !String(this.media.url).trim()) {
      throw new Error(`${this.messageType} message must contain media.url`);
    }
  }
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, receiver: 1, seen: 1 });

export default mongoose.models.Message ||
  mongoose.model("Message", messageSchema);
