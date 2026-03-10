import mongoose from "mongoose";

export const parseCursor = (raw) => {
  if (!raw) return null;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj?.createdAt || !obj?._id) return null;
    return {
      createdAt: new Date(obj.createdAt),
      _id: new mongoose.Types.ObjectId(obj._id),
    };
  } catch {
    return null;
  }
};

export const buildCursorFilter = (cursor) => {
  if (!cursor) return {};
  return {
    $or: [
      { createdAt: { $lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
    ],
  };
};
