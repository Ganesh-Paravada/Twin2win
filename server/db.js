import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;
let dbUrlUsed = "";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️ MONGODB_URI is not defined in environment variables. Running in-memory/mock mode for previews.");
    return { connected: false, fallback: true, message: "No connection string. Using local state fallback." };
  }

  try {
    // Set connection timeout to 4 seconds so it doesn't hang the server boot if the URI is inactive/incorrect
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    dbUrlUsed = uri;
    console.log("✅ Successfully connected to MongoDB database!");
    return { connected: true, fallback: false, message: "Connected to MongoDB." };
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    return { connected: false, fallback: true, message: `Connection failed: ${error.message}. Using local state fallback.` };
  }
}

export function getDbStatus() {
  return {
    connected: isConnected,
    uri: isConnected ? dbUrlUsed.replace(/\/\/.*@/, "//****:****@") : null, // hide password
    type: isConnected ? "MongoDB Atlas / Cloud" : "In-Memory Local Fallback"
  };
}
