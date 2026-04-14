// FILE: src/server.js
import "dotenv/config";
import mongoose from "mongoose";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocketServer } from "./socket/index.js";

const PORT = process.env.PORT || 5050;


const server = http.createServer(app);
// init socket.io
initSocketServer(server);

console.log(
  "CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_ID1
,process.env.GOOGLE_CLIENT_ID2);

async function start() {
  try {
    await connectDB();
     server.listen(PORT, "::", () => {
      console.log("🚀 Server running on:", PORT);
    });

    const shutdown = async () => {
      console.log("🛑 Shutting down...");
      server.close(async () => {
        await mongoose.disconnect();
        console.log("✅ Mongo disconnected. Bye!");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("❌ Start failed:", err.message);
    process.exit(1);
  }
}

start();

