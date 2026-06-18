import mongoose from "mongoose";

const KnowledgeChunkSchema = new mongoose.Schema({
  _id: { type: String },
  title: { type: String, required: true },
  category: { type: String, required: true }, // e.g., "Sprinting mechanics", "Aerobic threshold", "Recovery science"
  content: { type: String, required: true },
  recommendedForRange: {
    metric: { type: String }, // e.g., "speed", "stamina", "fatigue"
    min: { type: Number },
    max: { type: Number }
  },
  estimatedReadTime: { type: Number, default: 3 }, // in minutes
  createdAt: { type: Date, default: Date.now }
});

export const KnowledgeChunk = mongoose.model("KnowledgeChunk", KnowledgeChunkSchema);
