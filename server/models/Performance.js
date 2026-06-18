import mongoose from "mongoose";

const PerformanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sport: { type: String, required: true },
  speed: { type: Number, required: true },
  stamina: { type: Number, required: true },
  endurance: { type: Number, required: true },
  recovery: { type: Number, default: 0 },
  fatigue: { type: Number, default: 0 },
  readiness: { type: Number, default: 0 },
  points: { type: Number, required: true },
  videoName: { type: String },
  confidence: { type: Number, default: 90 },
  feedbackText: { type: String },
  feedbackPoints: [{ type: String }],
  scoringEvidence: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export const Performance = mongoose.model("Performance", PerformanceSchema);
