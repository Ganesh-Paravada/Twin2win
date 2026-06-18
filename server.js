import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { connectDB, getDbStatus } from "./server/db.js";
import authRoutes from "./server/routes/auth.js";
import coachRoutes from "./server/routes/coach.js";


const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Call database connection (it will fail gracefully to local fallback if offline or no MONGODB_URI)
  await connectDB();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/coach", coachRoutes);

  // Status & Diagnosis Endpoint
  app.get("/api/status", (req, res) => {
    const db = getDbStatus();
    const groqKeyConfigured = !!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("your_groq_api_key");
    const geminiKeyConfigured = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("MY_GEMINI_API_KEY");

    res.json({
      status: "online",
      database: db,
      groq: {
        configured: groqKeyConfigured,
        model: "llama-3.3-70b-versatile"
      },
      gemini: {
        configured: geminiKeyConfigured,
        model: "gemini-2.5-flash (coaching fallback)"
      },
      avatarTTS: {
        method: "WebSpeechSynthesis (Client-Side HTML5 + Lipsync Lipflapper Mode)"
      }
    });
  });

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, timestamp: new Date() });
  });

  // Serve static UI assets via Vite (development) vs Express (production build)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Serve static files
    app.use(express.static(distPath));
    // SPA Fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Twin2Win fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("FATAL startup error:", error);
});
