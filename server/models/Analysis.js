import mongoose from "mongoose";

const AnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  performanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Performance" },
  diagnosticTitle: { type: String, default: "Comprehensive Twin Analysis" },
  summaryMarkdown: { type: String, required: true },
  dietaryDirectives: [{ type: String }],
  knowledgeSuggestions: [{ type: String }], // titles or reference ids for articles of knowledgechunks
  createdAt: { type: Date, default: Date.now }
});

export const Analysis = mongoose.model("Analysis", AnalysisSchema);
