import mongoose from "mongoose";

const DietPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sport: { type: String, required: true },
  speed: { type: Number },
  stamina: { type: Number },
  title: { type: String, required: true },
  calories: { type: Number, default: 2500 },
  protein: { type: Number, default: 150 }, // in grams
  carbs: { type: Number, default: 300 }, // in grams
  fats: { type: Number, default: 80 }, // in grams
  meals: [{
    time: { type: String }, // e.g., "Breakfast"
    name: { type: String, required: true },
    portion: { type: String }, // e.g., "200g oatmeal with banana"
    description: { type: String }
  }],
  reasons: [{ type: String }], // Why AI recommended this
  createdAt: { type: Date, default: Date.now }
});

export const DietPlan = mongoose.model("DietPlan", DietPlanSchema);
