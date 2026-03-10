import mongoose from "mongoose";
const { Schema } = mongoose;

const PushTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    token: { type: String, required: true, unique: true, index: true },

    platform: { type: String, enum: ["android", "ios", "web"], required: true },
    deviceId: { type: String, default: null },

    appVersion: { type: String, default: null },
    isEnabled: { type: Boolean, default: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Optional: prevent multiple rows same user+device
PushTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: false });

const PushToken = mongoose.models.PushToken ||
  mongoose.model("PushToken", PushTokenSchema);

  export default PushToken;