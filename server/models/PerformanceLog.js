import mongoose from "mongoose";

const PerformanceLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  performanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Performance" },
  logType: { type: String, default: "Workout Log" }, // e.g. "Kinematics capture", "Heart-rate spike"
  metrics: {
    heartRateBpm: { type: Number },
    groundContactMs: { type: Number },
    verticalOscillationCm: { type: Number },
    cadenceSpm: { type: Number }
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const PerformanceLog = mongoose.model("PerformanceLog", PerformanceLogSchema);
