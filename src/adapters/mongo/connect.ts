import mongoose, { ConnectOptions } from "mongoose";

let isConnected = false; // 🔒 Prevent multiple connections in dev

export async function connectMongo(uri: string) {
  if (!uri) {
    throw new Error("❌ MONGO_URL environment variable is required");
  }

  if (isConnected) {
    console.log("⚡ Using existing MongoDB connection");
    return;
  }

  try {
    const options: ConnectOptions = {
      autoIndex: true, // build indexes (disable in production for performance)
      maxPoolSize: 10, // connection pool size
      serverSelectionTimeoutMS: 5000, // timeout after 5s instead of hanging
      socketTimeoutMS: 45000, // close sockets after 45s of inactivity
    };

    await mongoose.connect(uri, options);
    isConnected = true;

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1); // crash app if DB fails to connect
  }

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("⚠️ MongoDB disconnected. Retrying...");
  });
}
