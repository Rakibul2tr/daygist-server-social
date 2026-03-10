// FILE: src/utils/jwt.js
import jwt from "jsonwebtoken";

export const generateToken = (payload) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
};

export const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.verify(token, process.env.JWT_SECRET);
};
