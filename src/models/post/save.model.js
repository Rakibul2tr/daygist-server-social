import mongoose from "mongoose";

const saveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    targetType: {
      type: String,
      enum: ["post", "groupPost","ad"],
      required: true,
      index: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: "targetType", // 🔥 dynamic ref
    },
  },
  { timestamps: true },
);

// ✅ unique per user + target
saveSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });

const Save = mongoose.models.Save || mongoose.model("Save", saveSchema);
export default Save;
