// FILE: src/models/user/user.model.js
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    phone: { type: String, default: null },
    email: { type: String, default: null }, // optional public email (different from login email)
    website: { type: String, default: null },
    facebook: { type: String, default: null },
    instagram: { type: String, default: null },
    linkedin: { type: String, default: null },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullAddress: { type: String, default: null }, // "House/Road, Area..."
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    zip: { type: String, default: null },
  },
  { _id: false }
);

const educationItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: null }, // "BSc in CSE"
    institute: { type: String, default: null }, // "WeSoftin"
    from: { type: String, default: null }, // "2019"
    to: { type: String, default: null }, // "2023" / "Present"
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true, default: null },
    email: { type: String, unique: true }, // login email
    name: { type: String, default: "" },
    avatar: {
      url: { type: String, default: null },
      key: { type: String, default: null },
      provider: { type: String, default: "wasabi" },
    },

    cover: {
      url: { type: String, default: null },
      key: { type: String, default: null },
      provider: { type: String, default: "wasabi" },
    },

    username: { type: String, default: null },
    gender: { type: String, default: null },

    birthDate: { type: Date, default: null },
    country: { type: String, default: null },
    realCountry: { type: String, default: null },
    age: { type: String, default: null },

    // ✅ NEW: profile fields (optional)
    bio: { type: String, default: null }, // short bio
    about: { type: String, default: null }, // long about
    relationship: {
      type: String,
      enum: [
        "single",
        "in_relationship",
        "married",
        "complicated",
        "other",
        null,
      ],
      default: null,
    },
    address: { type: addressSchema, default: () => ({}) },
    education: { type: [educationItemSchema], default: [] },
    contact: { type: contactSchema, default: () => ({}) },

    role: {
      type: String,
      enum: ["USER", "ADMIN", "SELLER", "MODERATOR", "SUPPER ADMIN"],
      default: "USER",
    },

    accountStatus: {
      type: String,
      enum: [
        "active",
        "verified",
        "pending",
        "rejected",
        "suspended",
        "deleted",
      ],
      default: "pending",
      index: true,
    },

    profileCompleted: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    isNewUser: { type: Boolean, default: false },
    isSeller: { type: Boolean, default: false },
    isMonetization: { type: Boolean, default: false },
    monetizationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ✅ nodemon restart/hot reload safe
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
