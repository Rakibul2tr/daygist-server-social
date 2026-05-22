import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    // earning rules
    viewRate: { type: Number, default: 0.5 },
    likeRate: { type: Number, default: 0.2 },
    shareRate: { type: Number, default: 0.2 },
    commentRate: { type: Number, default: 0.2 },

    // feature control
    postCreateEnable: { type: Boolean, default: true },
    generalVideoEnabled: { type: Boolean, default: true },
    reelEnabled: { type: Boolean, default: true },
    ecommerceEnabled: { type: Boolean, default: true },

    // limits
    minWatchSeconds: { type: Number, default: 10 },
    minWithdrawAmount: { type: Number, default: 5 },

    // global switch
    earningEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Setting =
  mongoose.models.Setting || mongoose.model("Setting", settingSchema);

export default Setting;
