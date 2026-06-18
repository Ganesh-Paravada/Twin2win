import mongoose from "mongoose";

const AthleteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sport: { type: String, required: true },
  country: { type: String, default: "Global" },
  points: { type: Number, default: 800 },
  speed: { type: Number, default: 80 },
  stamina: { type: Number, default: 80 },
  endurance: { type: Number, default: 80 },
  recovery: { type: Number, default: 80 },
  readiness: { type: Number, default: 80 },
  fatigue: { type: Number, default: 15 },
  photo: { type: String, default: "🏃" },
  photoUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Athlete = mongoose.model("Athlete", AthleteSchema);
