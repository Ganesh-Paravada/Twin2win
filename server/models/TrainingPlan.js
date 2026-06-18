import mongoose from "mongoose";

const TrainingPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sport: { type: String, required: true },
  title: { type: String, required: true },
  intensity: { type: String, default: "Moderate" }, // e.g., "Low", "Moderate", "High"
  durationWeeks: { type: Number, default: 4 },
  routines: [{
    day: { type: String }, // e.g., "Day 1", "Monday"
    exercise: { type: String, required: true },
    sets: { type: Number, default: 3 },
    reps: { type: String }, // e.g., "12 reps", "400m repetition x 6"
    instructions: { type: String }
  }],
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const TrainingPlan = mongoose.model("TrainingPlan", TrainingPlanSchema);
