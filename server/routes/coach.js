import express from "express";
import mongoose from "mongoose";
import { Groq } from "groq-sdk";
import { GoogleGenAI } from "@google/genai";
import { Performance } from "../models/Performance.js";
import { DietPlan } from "../models/DietPlan.js";
import { KnowledgeChunk } from "../models/KnowledgeChunk.js";
import { TrainingPlan } from "../models/TrainingPlan.js";
import { PerformanceLog } from "../models/PerformanceLog.js";
import { Analysis } from "../models/Analysis.js";
import { Athlete } from "../models/Athlete.js";
import { authenticateToken } from "./auth.js";

const router = express.Router();

// Fallbacks in-memory stores for newly implemented collections when MongoDB Atlas is disconnected
const localPerformances = [];
const localDietPlans = [];
const localTrainingPlans = [];
const localPerformanceLogs = [];
const localAnalyses = [];

// Populate local default knowledge chunks so there is always outstanding curated athletic advice
const localKnowledgeChunks = [
  {
    _id: "kc1",
    title: "Sprinting Mechanics: Heel Transition Recovery",
    category: "Sprinting Mechanics",
    content: "To unlock maximum forward propulsion and velocity, focus on shortening ground contact time. Drive the knees high to form a 90-degree angle, and strike the synthetic track on your balls-of-feet directly underneath your center of mass. Overstriding triggers a braking effect, shifting impact parameters higher and stressing the hamstring complex unnecessarily.",
    recommendedForRange: { metric: "speed", min: 0, max: 75 },
    estimatedReadTime: 3,
    createdAt: new Date()
  },
  {
    _id: "kc2",
    title: "O2 Aerobic Capacity and Threshold Intervals",
    category: "Aerobic Threshold",
    content: "Preserving a high steady state threshold demands progressive VO2 intervals. Execute 800-meter sprints at 90% maximal heart rate, followed by a light active jogging recovery of 400 meters. This builds mitochondrial volume inside deep motor tissues, promoting rapid lactate clearance and delaying homeostatic collapse.",
    recommendedForRange: { metric: "stamina", min: 0, max: 75 },
    estimatedReadTime: 4,
    createdAt: new Date()
  },
  {
    _id: "kc3",
    title: "Parasympathetic Recovery and Active Sleep Science",
    category: "Recovery Science",
    content: "Athletic recovery is governed by the autonomic nervous system. To restore readiness and clear acute muscular inflammation, aim for deep slow-wave stage sleeps. Consume 300mg elemental magnesium glycinate and practice 4-7-8 cyclic breathing to establish optimal heart rate variability (HRV) indices.",
    recommendedForRange: { metric: "recovery", min: 0, max: 80 },
    estimatedReadTime: 3,
    createdAt: new Date()
  },
  {
    _id: "kc4",
    title: "The Ultimate Sprint Clean & Front Squat Protocol",
    category: "Sprinting Mechanics",
    content: "Pure speed demands high ground force coefficient. Perform explosive clean complex reps starting from high-hang position. Maximize vertical hip extension velocity before catching. Transition directly into a deep back-flat front squat.",
    recommendedForRange: { metric: "speed", min: 75, max: 100 },
    estimatedReadTime: 2,
    createdAt: new Date()
  }
];

const clampScore = (value) => Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
const clampRange = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

function angleMetric(poseAngles = {}, key) {
  const metric = poseAngles[key] || {};
  if (!Number.isFinite(metric.avg)) return null;
  return {
    avg: Math.round(metric.avg),
    min: Math.round(Number.isFinite(metric.min) ? metric.min : metric.avg),
    max: Math.round(Number.isFinite(metric.max) ? metric.max : metric.avg),
  };
}

function scoreNearRange(value, low, high, tolerance = 35) {
  if (!Number.isFinite(value)) return 0.5;
  if (value >= low && value <= high) return 1;
  const distance = value < low ? low - value : value - high;
  return clampRange(1 - distance / tolerance, 0, 1);
}

function buildPoseTechnique(videoMetrics = {}) {
  const poseAngles = videoMetrics.poseAngles || {};
  const knee = angleMetric(poseAngles, "kneeAngle");
  const hip = angleMetric(poseAngles, "hipAngle");
  const elbow = angleMetric(poseAngles, "elbowAngle");
  const torso = angleMetric(poseAngles, "torsoLean");
  const detectedFrames = Math.round(Number(poseAngles.detectedFrames) || 0);
  const poseConfidence = clampRange(poseAngles.confidence, 0, 1);

  if (detectedFrames < 3 || !knee || !hip || !torso) {
    throw new Error("Pose-angle evidence is required: knee, hip, and torso lean need at least 3 detected frames.");
  }

  const kneeDrive = scoreNearRange(knee.avg, 82, 145);
  const hipExtension = scoreNearRange(hip.avg, 85, 155);
  const torsoControl = scoreNearRange(torso.avg, 4, 24, 24);
  const armAction = elbow ? scoreNearRange(elbow.avg, 65, 150) : 0.55;
  const techniqueSignal = clampRange(
    kneeDrive * 0.35 + hipExtension * 0.3 + torsoControl * 0.2 + armAction * 0.1 + poseConfidence * 0.05,
    0,
    1
  );

  return {
    techniqueSignal,
    detectedFrames,
    poseConfidence,
    poseAngles: [
      { label: "Knee angle", ...knee },
      { label: "Hip angle", ...hip },
      ...(elbow ? [{ label: "Elbow angle", ...elbow }] : []),
      { label: "Torso lean", ...torso },
    ],
  };
}

function scoreFromVideoFeatures(videoMetrics = {}, sport = "Running") {
  const motionIntensity = clampRange(videoMetrics.motionIntensity, 0, 1);
  const motionConsistency = clampRange(videoMetrics.motionConsistency, 0, 1);
  const activityDensity = clampRange(videoMetrics.activityDensity, 0, 1);
  const stability = clampRange(videoMetrics.stability, 0, 1);
  const durationSeconds = clampRange(videoMetrics.durationSeconds, 1, 900);
  const lightingQuality = clampRange(videoMetrics.lightingQuality, 0, 1);
  const edgeActivity = clampRange(videoMetrics.edgeActivity, 0, 1);
  const sampleCount = Math.max(1, Math.round(Number(videoMetrics.sampleCount) || 0));
  const poseTechnique = buildPoseTechnique(videoMetrics);

  if (sampleCount < 4 || durationSeconds < 1) {
    throw new Error("Video analysis needs a playable clip with enough visible motion.");
  }

  const sportWeights = {
    Running: { speed: 1.15, stamina: 0.9, endurance: 0.95 },
    Football: { speed: 1.05, stamina: 1, endurance: 0.95 },
    Basketball: { speed: 1.05, stamina: 0.95, endurance: 0.9 },
    Tennis: { speed: 1, stamina: 0.95, endurance: 0.9 },
    Athletics: { speed: 1.05, stamina: 1, endurance: 1 },
    Badminton: { speed: 1.08, stamina: 0.92, endurance: 0.88 },
  };
  const weights = sportWeights[sport] || sportWeights.Athletics;

  const visibility = 0.75 + lightingQuality * 0.25;
  const paceSignal = (motionIntensity * 0.55 + activityDensity * 0.3 + edgeActivity * 0.15) * visibility;
  const controlSignal = motionConsistency * 0.65 + stability * 0.35;
  const techniqueSignal = poseTechnique.techniqueSignal;
  const durationSignal = Math.min(1, Math.log10(durationSeconds + 1) / Math.log10(181));
  const fatigueLoad = motionIntensity * 0.38 + (1 - motionConsistency) * 0.32 + (1 - stability) * 0.2 + (1 - lightingQuality) * 0.1;

  const speed = clampScore((42 + paceSignal * 42 + controlSignal * 8 + techniqueSignal * 12) * weights.speed);
  const stamina = clampScore((40 + controlSignal * 32 + durationSignal * 18 + activityDensity * 8 + techniqueSignal * 8) * weights.stamina);
  const endurance = clampScore((38 + durationSignal * 30 + motionConsistency * 20 + stability * 8 + techniqueSignal * 8) * weights.endurance);
  const recovery = clampScore(88 - fatigueLoad * 40 + stability * 7 + techniqueSignal * 7);
  const fatigue = clampScore(8 + fatigueLoad * 42 + (1 - techniqueSignal) * 8);
  const readiness = clampScore((speed * 0.25 + stamina * 0.25 + endurance * 0.25 + recovery * 0.25) - fatigue * 0.22);
  const performanceScore = clampScore((speed + stamina + endurance + readiness) / 4);
  const points = Math.round(performanceScore * 10 + readiness * 1.5 - fatigue);
  const confidence = clampScore(48 + sampleCount * 1.5 + lightingQuality * 12 + stability * 10 + poseTechnique.poseConfidence * 18);
  const scoringEvidence = {
    poseAngles: poseTechnique.poseAngles,
    scoreBreakdown: [
      { label: "Pose frames", value: `${poseTechnique.detectedFrames}/${sampleCount}` },
      { label: "Pose confidence", value: `${Math.round(poseTechnique.poseConfidence * 100)}%` },
      { label: "Motion signal", value: `${Math.round(paceSignal * 100)}%` },
      { label: "Technique signal", value: `${Math.round(techniqueSignal * 100)}%` },
      { label: "Control signal", value: `${Math.round(controlSignal * 100)}%` },
      { label: "Lighting signal", value: `${Math.round(lightingQuality * 100)}%` },
    ],
    summary: `Score uses measured pose angles from ${poseTechnique.detectedFrames} video frames plus motion, control, duration, and lighting signals.`,
  };

  return {
    speed,
    stamina,
    endurance,
    recovery,
    fatigue,
    readiness,
    points,
    confidence,
    performanceScore,
    scoringEvidence,
  };
}


// LiveAvatar (formerly HeyGen) Real-Time Human Avatar Integration Endpoints
let cachedContextId = "";

router.get("/heygen/config", (req, res) => {
  const apiKey = process.env.HEYGEN_API_KEY || "";
  const apiKeyConfigured = apiKey !== "YOUR_HEYGEN_API_KEY" && apiKey !== "YOUR_LIVEAVATAR_API_KEY" && apiKey !== "";
  res.json({
    heygenApiKeyConfigured: apiKeyConfigured,
    defaultAvatarId: process.env.HEYGEN_AVATAR_ID || (apiKeyConfigured ? "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a" : "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a") // Standard default sandbox or custom avatar
  });
});

router.post("/heygen/token", async (req, res) => {
  try {
    let apiKey = process.env.HEYGEN_API_KEY;
    
    // Allow client to supply key if backend isn't set
    if (req.body && req.body.apiKey) {
      apiKey = req.body.apiKey;
    }

    const isSandbox = !apiKey || apiKey === "YOUR_HEYGEN_API_KEY" || apiKey === "YOUR_LIVEAVATAR_API_KEY" || apiKey === "";
    
    const avatarId = req.body.avatarId || process.env.HEYGEN_AVATAR_ID || "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";
    const voiceIdVal = req.body.voiceId || "26b2036171c14ab48d6bab47399025e1";

    const requestBody = {
      mode: "FULL",
      avatar_id: isSandbox ? "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a" : avatarId,
      is_sandbox: isSandbox,
      avatar_persona: {
        voice_id: voiceIdVal,
        language: "en"
      }
    };

    const headers = {
      "Content-Type": "application/json"
    };

    if (!isSandbox) {
      headers["X-API-KEY"] = apiKey;

      // Lazy check and creation of structural context so the avatar is speakable (not silent)
      if (!cachedContextId) {
        try {
          const contextRes = await fetch("https://api.liveavatar.com/v1/contexts", {
            method: "POST",
            headers: {
              "X-API-KEY": apiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: "Digital Twin Athletic Advisor",
              prompt: "You are an elite athletic coach and sports biomechanics expert. Analyze athletic telemetry and provide high-performance sports insights on speed, stamina, endurance, fatigue, and recovery metrics.",
              opening_text: "Hello champion! I am your AI digital twin and athletic coach. Let's optimize your athletic performance."
            })
          });
          const contextData = await contextRes.json();
          if (contextRes.ok && contextData.data?.id) {
            cachedContextId = contextData.data.id;
          }
        } catch (contextErr) {
          console.warn("⚠️ Failed to create LiveAvatar context: ", contextErr.message);
        }
      }

      if (cachedContextId) {
        requestBody.avatar_persona.context_id = cachedContextId;
      }
    } else {
      // Sandbox mode requires some dummy key to satisfy gateways or standard sandbox path
      headers["X-API-KEY"] = "sandbox";
    }

    const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson.error?.message || resJson.message || "Failed to retrieve access/session token from LiveAvatar.");
    }

    const token = resJson.data?.session_token || resJson.session_token;
    if (!token) {
      throw new Error("Session token payload absent from LiveAvatar streaming response.");
    }

    const sessionId = resJson.data?.session_id || "";

    return res.json({ token, sessionId, isSandbox });
  } catch (error) {
    console.error("❌ LiveAvatar Token Error:", error);
    return res.status(500).json({ error: error.message });
  }
});


// Tavus Conversational Digital Twin Avatar Integration Endpoints
router.get("/tavus/config", (req, res) => {
  const apiKey = process.env.TAVUS_API_KEY || "";
  const apiKeyConfigured = apiKey !== "YOUR_TAVUS_API_KEY" && apiKey !== "";
  res.json({
    tavusApiKeyConfigured: apiKeyConfigured,
    defaultReplicaId: process.env.TAVUS_REPLICA_ID || "r79a0cf83b" // Default template or sandbox
  });
});

router.post("/tavus/conversation", async (req, res) => {
  try {
    let apiKey = process.env.TAVUS_API_KEY;
    
    // Allow client to supply key if backend isn't set
    if (req.body && req.body.apiKey) {
      apiKey = req.body.apiKey;
    }

    if (!apiKey || apiKey === "YOUR_TAVUS_API_KEY" || apiKey === "") {
      throw new Error("Tavus API Key is required. Please set TAVUS_API_KEY in the environment or provide it in the input.");
    }

    const replicaId = req.body.replicaId || process.env.TAVUS_REPLICA_ID || "r79a0cf83b";
    const conversationalContext = req.body.conversationalContext || "You are an elite athletic coach and sports biomechanics expert. Analyze athletic telemetry and provide high-performance sports insights.";
    const customGreeting = req.body.customGreeting || "Hi there athlete! Let's review your athletic biometrics and optimize your performance.";

    const requestBody = {
      replica_id: replicaId,
      conversational_context: conversationalContext,
      custom_greeting: customGreeting,
      properties: {
        max_duration: 600
      }
    };

    const response = await fetch("https://api.tavus.io/v1/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson.message || resJson.error || "Failed to start conversation with Tavus.");
    }

    // Returns conversation_id, conversation_url, etc.
    return res.json({
      conversationId: resJson.conversation_id,
      conversationUrl: resJson.conversation_url || resJson.join_link || resJson.join_url || "",
      status: resJson.status
    });
  } catch (error) {
    console.error("❌ Tavus Conversation Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/tavus/replicas", async (req, res) => {
  try {
    let apiKey = process.env.TAVUS_API_KEY;
    if (req.body && req.body.apiKey) {
      apiKey = req.body.apiKey;
    }

    if (!apiKey || apiKey === "YOUR_TAVUS_API_KEY" || apiKey === "") {
      return res.json({ replicas: [] });
    }

    const response = await fetch("https://api.tavus.io/v1/replicas", {
      method: "GET",
      headers: {
        "x-api-key": apiKey
      }
    });

    const resJson = await response.json();
    if (!response.ok) {
      throw new Error(resJson.message || "Failed to list replicas from Tavus.");
    }

    const replicas = resJson.data || resJson || [];
    return res.json({ replicas });
  } catch (error) {
    console.error("❌ Tavus Replicas Error:", error);
    return res.status(500).json({ error: error.message });
  }
});


// Seed sample performances matching our default athletes
export const defaultAthletePerformances = [
  { id: "p1", name: 'Usain Bolt', sport: 'Running', country: 'Jamaica', points: 985, speed: 98, stamina: 92, endurance: 88, recovery: 90, readiness: 95, fatigue: 12, photo: '🇯🇲' },
  { id: "p2", name: 'Noah Lyles', sport: 'Running', country: 'USA', points: 965, speed: 97, stamina: 85, endurance: 80, recovery: 82, readiness: 90, fatigue: 18, photo: '🇺🇸' },
  { id: "p3", name: 'Eliud Kipchoge', sport: 'Running', country: 'Kenya', points: 978, speed: 82, stamina: 99, endurance: 99, recovery: 95, readiness: 97, fatigue: 8, photo: '🇰🇪' },
  { id: "p4", name: 'Jakob Ingebrigtsen', sport: 'Running', country: 'Norway', points: 910, speed: 84, stamina: 93, endurance: 92, recovery: 86, readiness: 89, fatigue: 14, photo: '🇳🇴' },
  { id: "p5", name: 'Cristiano Ronaldo', sport: 'Football', country: 'Portugal', points: 960, speed: 90, stamina: 86, endurance: 84, recovery: 88, readiness: 90, fatigue: 12, photo: '🇵🇹' },
  { id: "p6", name: 'Lionel Messi', sport: 'Football', country: 'Argentina', points: 970, speed: 85, stamina: 88, endurance: 82, recovery: 90, readiness: 92, fatigue: 10, photo: '🇦🇷' },
  { id: "p7", name: 'Kylian Mbappe', sport: 'Football', country: 'France', points: 945, speed: 95, stamina: 82, endurance: 78, recovery: 80, readiness: 88, fatigue: 16, photo: '🇫🇷' },
  { id: "p8", name: 'Erling Haaland', sport: 'Norway', country: 'Norway', points: 940, speed: 92, stamina: 80, endurance: 76, recovery: 78, readiness: 85, fatigue: 18, photo: '🇳🇴' },
];

// Helper function to dynamically generate custom DietPlan, TrainingPlan, PerformanceLog, and Analysis reports matching user scores
async function generateDietAndTraining(userId, sport, metrics, performanceId, isDbConnected) {
  const { speed, stamina, endurance, recovery, fatigue, readiness } = metrics;
  
  // 1. DYNAMIC DIET PLAN GENERATOR
  let dietTitle = `${sport} Endurance Fueling`;
  let calories = 2600;
  let protein = 140;
  let carbs = 320;
  let fats = 75;
  let reasons = [];
  let meals = [];

  if (speed < 75) {
    dietTitle = "Explosive Power & Sprint Fuel";
    calories = 2900;
    protein = 180;
    carbs = 340;
    fats = 80;
    reasons = [
      "Increased protein intake to facilitate rapid cross-bridge myofibril muscle repair.",
      "Balanced low glycemic carbs around the sprint training window to sustain explosive velocity."
    ];
    meals = [
      { time: "07:30 Breakfast", name: "High-Protein Omega Berries Cup", portion: "20Qg Greek yogurt, 40g oats, organic honey, chia seeds", description: "Provides immediate branched-chain amino acids." },
      { time: "12:30 Lunch", name: "Sprint Power Quinoa Bowl", portion: "200g Grilled salmon filet, 150g baked sweet potato, asparagus", description: "High antioxidant, loaded with omega-3 fatty acids." },
      { time: "15:30 Pre-Workout", name: "Creatine Nitrate Charge Shake", portion: "1 scoop clean whey, 1 organic banana, 20g almond butter", description: "Fuels muscle glycogen and nitric oxide thresholds." },
      { time: "19:00 Dinner", name: "Recovery Turkey Marinara Pasta", portion: "180g Lean ground turkey, whole wheat pasta, organic tomatoes", description: "High complex carbohydrates to rebuild glycogen stores." }
    ];
  } else if (stamina < 75) {
    dietTitle = "Aerobic Oxidative Threshold Carbo-Loading";
    calories = 3100;
    protein = 150;
    carbs = 420;
    fats = 85;
    reasons = [
      "High carb allocation to maximize live muscle and liver glycogen stores for prolonged efforts.",
      "Adequate electrolytes and healthy fats to support aerobic cardiovascular fat-oxidation efficiency."
    ];
    meals = [
      { time: "07:30 Breakfast", name: "Glycogen Charging Oatmeal Powerhouse", portion: "120g rolled oats, 1 scoop vanilla protein, 2 tbsp raisins", description: "Sustained-release slow digesting complex carbohydrates." },
      { time: "12:30 Lunch", name: "Gluten-Free Chicken Quinoa Medley", portion: "220g Chicken breast, 200g fluffy quinoa, steamed spinach", description: "Sustained mineral complex with magnesium and potassium." },
      { time: "16:00 Snack", name: "Autonomic Recovery Toast", portion: "2 slices sourdough bread, a whole mashed organic avocado, sea salt", description: "Loaded with potassium and healthy cell-membrane monounsaturated fats." },
      { time: "19:30 Dinner", name: "Mitochondrial Energy Steak Plate", portion: "180g grass-fed lean sirloin steak, baked potato, broccoli", description: "Rich iron/zinc parameters for maximum oxygen delivery metrics." }
    ];
  } else {
    dietTitle = "Olympic Athletic Balance Fuel";
    calories = 2750;
    protein = 160;
    carbs = 360;
    fats = 78;
    reasons = [
      "Balanced macronutrient configuration tailored for combined acceleration and endurance stability.",
      "High micronutrient densities to promote parasympathetic recovery and low core fatigue."
    ];
    meals = [
      { time: "08:00 Breakfast", name: "Champion Whole Egg Omelet", portion: "3 whole organic eggs, spinach, mushrooms, 1 organic banana", description: "High choline and clean fuel source." },
      { time: "13:00 Lunch", name: "Biokinetic Tuna-Salad Wrap", portion: "150g albacore tuna, spinach tortilla, walnuts, celery, apple", description: "Omega fats combined with clean dietary fiber." },
      { time: "18:30 Dinner", name: "High-Altitude Lemon Herb Cod loin", portion: "200g Cod loin, wild rice mixture, roasted carrots & zucchini", description: "Light digestion enabling deep slow-wave luxury anabolic sleeps." }
    ];
  }

  // 2. DYNAMIC TRAINING PLAN GENERATOR
  let trainingTitle = `High-Efficiency ${sport} Protocol`;
  let routines = [];
  let notes = "";

  if (speed < 75) {
    trainingTitle = "Sprint Neuromuscular Acceleration Protocol";
    routines = [
      { day: "Day 1 (Max Velocity)", exercise: "A-Skips & High Knee Drives", sets: 3, reps: "30 meters", instructions: "Perform with high hip elevation and zero heel-collapsing mechanics." },
      { day: "Day 1 (Max Velocity)", exercise: "Block Starts & Absolute Acceleration", sets: 5, reps: "40 meters", instructions: "Exit with 45-degree explosive lean. Rest 3 minutes between reps." },
      { day: "Day 2 (Strength Power)", exercise: "Explosive Hang Cleans", sets: 4, reps: "5 repetitions", instructions: "Catch high and tight. Prioritize triple-extension force." },
      { day: "Day 3 (Speed Endurance)", exercise: "Flying 60s at 95% intensity", sets: 4, reps: "60 meters", instructions: "20m acceleration build-up, 20m peak velocity hold, 20m decelerate." }
    ];
    notes = "Neuromuscular adaptation requires complete rest. Never run velocity sets under highly fatigued states.";
  } else {
    trainingTitle = "Oxidative Vo2-Max Stamina Builder";
    routines = [
      { day: "Day 1 (Aerobic)", exercise: "Lactate Threshold Split Intervals", sets: 4, reps: "1000 meters", instructions: "Run at 10k pace. Take exactly 75 seconds recovery walks." },
      { day: "Day 2 (Conditioning)", exercise: "Tempo Fartlek Runs", sets: 1, reps: "30 minutes", instructions: "Stagger alternating 3-min threshold pace with 2-min aerobic pace." },
      { day: "Day 3 (Isometric)", exercise: "Isometric Single-Leg Calf Holds", sets: 3, reps: "45 seconds", instructions: "Strengthens Achilles tendon tension elastic energy return rate." }
    ];
    notes = "Focus on preserving a rhythmic breathing cycle. Keep respiratory muscles relaxed.";
  }

  // 3. DETAILED PERFORMANCE LOG RUNS
  const hr = Math.round(130 + fatigue * 0.8 + stamina * 0.28);
  const contact = Math.round(255 - speed * 0.55 + fatigue * 0.35);
  const oscillation = Number((7.2 + (100 - recovery) * 0.035 + fatigue * 0.018).toFixed(1));
  const cadence = Math.round(150 + speed * 0.28 + stamina * 0.12);

  // 4. DETAILED COMPREHENSIVE NARRATIVE REPORT (ANALYSIS)
  const score = Math.floor((speed + stamina + endurance + recovery) / 4);
  const analysisSummary = `### **AI Biogenetic Performance Diagnostic Report**

Hello Athlete! After scanning your athletic telemetry, our AI built your **Sport Digital Twin**. Your cumulative readiness score stands at **${readiness}%**, showing robust adaptive potential but noting target markers needing precise sports science stimulus.

#### **I. Nutrition Diagnostic**
We have constructed a custom **${calories} kcal** nutrition regimen:
- **Protein Core:** ${protein}g daily directly target structural protein synthesis to reduce fatigue indices.
- **Carbohydrate Density:** ${carbs}g of carbohydrates will fully saturate athletic reserves to boost running velocity.

#### **II. Training Directive**
Focus purely on targeted explosive mechanics. Your velocity threshold (${speed}/100) indicates high force return capability but demands **triple hip extension** training. Follow the appended **${trainingTitle}** routines for the upcoming microcycle.`;

  const newDietObj = {
    userId,
    sport,
    speed,
    stamina,
    title: dietTitle,
    calories,
    protein,
    carbs,
    fats,
    meals,
    reasons,
    createdAt: new Date()
  };

  const newTrainingObj = {
    userId,
    sport,
    title: trainingTitle,
    intensity: speed < 75 ? "High" : "Moderate",
    durationWeeks: 4,
    routines,
    notes,
    createdAt: new Date()
  };

  const newLogObj = {
    userId,
    performanceId,
    logType: `${sport} Biomechanical Feed`,
    metrics: {
      heartRateBpm: hr,
      groundContactMs: contact,
      verticalOscillationCm: oscillation,
      cadenceSpm: cadence
    },
    notes: `${sport} kinematic extraction: cadence measured at ${cadence} SPM with heartrate peak of ${hr} BPM.`,
    createdAt: new Date()
  };

  const newAnalysisObj = {
    userId,
    performanceId,
    diagnosticTitle: `${sport} Digital Twin Bio-Diagnostic`,
    summaryMarkdown: analysisSummary,
    dietaryDirectives: reasons,
    knowledgeSuggestions: speed < 75 ? ["kc1", "kc4"] : ["kc2", "kc3"],
    createdAt: new Date()
  };

  if (isDbConnected) {
    const dbDiet = new DietPlan(newDietObj);
    const dbTraining = new TrainingPlan(newTrainingObj);
    const dbLog = new PerformanceLog(newLogObj);
    const dbAnalysis = new Analysis(newAnalysisObj);

    await Promise.all([
      dbDiet.save(),
      dbTraining.save(),
      dbLog.save(),
      dbAnalysis.save()
    ]);
  } else {
    newDietObj._id = new mongoose.Types.ObjectId().toString();
    newTrainingObj._id = new mongoose.Types.ObjectId().toString();
    newLogObj._id = new mongoose.Types.ObjectId().toString();
    newAnalysisObj._id = new mongoose.Types.ObjectId().toString();

    // Flush older ones so user only has 1 active diet and training recommendation
    const dietIndex = localDietPlans.findIndex(d => d.userId === userId);
    if (dietIndex !== -1) localDietPlans.splice(dietIndex, 1);
    
    const trainIndex = localTrainingPlans.findIndex(t => t.userId === userId);
    if (trainIndex !== -1) localTrainingPlans.splice(trainIndex, 1);

    localDietPlans.push(newDietObj);
    localTrainingPlans.push(newTrainingObj);
    localPerformanceLogs.push(newLogObj);
    localAnalyses.push(newAnalysisObj);
  }

  return {
    dietPlan: newDietObj,
    trainingPlan: newTrainingObj,
    performanceLog: newLogObj,
    analysis: newAnalysisObj
  };
}

// POST ANALYZE PERFORMANCE
router.post("/analyze", authenticateToken, async (req, res) => {
  try {
    const { sport, videoName, videoMetrics } = req.body;
    const userId = req.user?.userId;
    const userName = req.user?.name || "Athlete";

    if (!sport) {
      return res.status(400).json({ error: "Sport type is required" });
    }

    if (!videoMetrics) {
      return res.status(400).json({ error: "Video-derived metrics are required for analysis." });
    }

    const {
      speed,
      stamina,
      endurance,
      recovery,
      fatigue,
      readiness,
      points,
      confidence,
      performanceScore,
      scoringEvidence,
    } = scoreFromVideoFeatures(videoMetrics, sport);
    const score = performanceScore;

    const evidenceByLabel = Object.fromEntries(scoringEvidence.poseAngles.map((item) => [item.label, item]));
    const knee = evidenceByLabel["Knee angle"];
    const hip = evidenceByLabel["Hip angle"];
    const torso = evidenceByLabel["Torso lean"];
    const feedbackPoints = [
      `Score ${score}/100 is based on measured pose angles plus video motion signals.`,
      `Knee angle averaged ${knee.avg} degrees across detected frames, range ${knee.min}-${knee.max}.`,
      `Hip angle averaged ${hip.avg} degrees across detected frames, range ${hip.min}-${hip.max}.`,
      `Torso lean averaged ${torso.avg} degrees across detected frames, range ${torso.min}-${torso.max}.`,
      `Motion/control evidence: ${scoringEvidence.scoreBreakdown.map(item => `${item.label} ${item.value}`).join(", ")}.`
    ];
    const feedbackText = feedbackPoints.join("\n");
    let apiUsed = "Deterministic Pose Evidence Engine";


    const isDbConnected = mongoose.connection.readyState === 1;

    let performanceId = "";

    if (isDbConnected) {
      const perf = new Performance({
        userId,
        sport,
        speed,
        stamina,
        endurance,
        recovery,
        fatigue,
        readiness,
        points,
        videoName,
        confidence,
        feedbackText,
        feedbackPoints,
        scoringEvidence
      });
      await perf.save();
      performanceId = perf._id.toString();
    } else {
      // In-memory Save
      const tempId = new mongoose.Types.ObjectId().toString();
      const perfObj = {
        _id: tempId,
        userId,
        sport,
        speed,
        stamina,
        endurance,
        recovery,
        fatigue,
        readiness,
        points,
        videoName,
        confidence,
        feedbackText,
        feedbackPoints,
        scoringEvidence,
        createdAt: new Date()
      };
      localPerformances.push(perfObj);
      performanceId = tempId;
    }

    // Call dynamic diet & training plan generation matching their new scores
    const twinOutput = await generateDietAndTraining(
      userId,
      sport,
      { speed, stamina, endurance, recovery, fatigue, readiness },
      performanceId,
      isDbConnected
    ).catch(err => {
      console.error("⚠️ AI Diet & Training generation failed gracefully:", err.message);
      return null;
    });

    return res.json({
      id: performanceId,
      sport,
      speed,
      stamina,
      endurance,
      recovery,
      fatigue,
      readiness,
      points,
      videoName,
      confidence,
      feedbackText,
      feedbackPoints,
      scoringEvidence,
      apiUsed,
      twinDetails: twinOutput,
      storageType: isDbConnected ? "MongoDB Atlas" : "Local State Fallback"
    });
  } catch (error) {
    console.error("Analysis route error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// GET DYNAMIC TWIN ADVISORY DETAILS (Diet, Training, Logs, Analysis, Knowledge)
router.get("/twin-details", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isDbConnected = mongoose.connection.readyState === 1;

    let dietPlan = null;
    let trainingPlan = null;
    let latestLog = null;
    let latestAnalysis = null;
    let allKnowledge = [];

    if (isDbConnected) {
      dietPlan = await DietPlan.findOne({ userId }).sort({ createdAt: -1 });
      trainingPlan = await TrainingPlan.findOne({ userId }).sort({ createdAt: -1 });
      latestLog = await PerformanceLog.findOne({ userId }).sort({ createdAt: -1 });
      latestAnalysis = await Analysis.findOne({ userId }).sort({ createdAt: -1 });
      allKnowledge = await KnowledgeChunk.find({});
      
      // If no knowledge chunks exist in MongoDB, automatically seed them
      if (allKnowledge.length === 0) {
        try {
          await KnowledgeChunk.insertMany(localKnowledgeChunks);
          allKnowledge = await KnowledgeChunk.find({});
        } catch (seedingErr) {
          console.error("Knowledge seeding error:", seedingErr);
        }
      }
    } else {
      dietPlan = localDietPlans.find(d => d.userId === userId) || null;
      trainingPlan = localTrainingPlans.find(t => t.userId === userId) || null;
      latestLog = localPerformanceLogs.filter(l => l.userId === userId).sort((a,b) => b.createdAt - a.createdAt)[0] || null;
      latestAnalysis = localAnalyses.filter(a => a.userId === userId).sort((a,b) => b.createdAt - a.createdAt)[0] || null;
      allKnowledge = localKnowledgeChunks;
    }

    if (!dietPlan || !trainingPlan) {
      const defaultMetrics = { speed: 70, stamina: 70, endurance: 68, recovery: 72, fatigue: 15, readiness: 85 };
      const fallbackOutput = await generateDietAndTraining(userId, "Running", defaultMetrics, null, isDbConnected);
      dietPlan = fallbackOutput.dietPlan;
      trainingPlan = fallbackOutput.trainingPlan;
      latestLog = fallbackOutput.performanceLog;
      latestAnalysis = fallbackOutput.analysis;
    }

    return res.json({
      dietPlan,
      trainingPlan,
      latestLog,
      latestAnalysis,
      knowledgeChunks: allKnowledge
    });
  } catch (error) {
    console.error("Error fetching twin details:", error);
    return res.status(500).json({ error: error.message });
  }
});

// GET PERFORMANCE LIST FOR CURRENT ATHLETE
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isDbConnected = mongoose.connection.readyState === 1;

    let history = [];

    if (isDbConnected) {
      history = await Performance.find({ userId }).sort({ createdAt: -1 });
    } else {
      history = localPerformances
        .filter(p => p.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET GLOBAL LEADERBOARD (Combining Defaults + Added users with real profiles)
router.get("/leaderboard", async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    // Build the dynamic leaderboard pool
    let activeAthletes = [...defaultAthletePerformances];

    if (isDbConnected) {
      const { User } = await import("../models/User.js");
      const dbUsers = await User.find({});
      const dbPerformances = await Performance.find({});

      // Group performance by user
      for (const user of dbUsers) {
        const perf = dbPerformances
          .filter(p => p.userId.toString() === user._id.toString())
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (perf) {
          activeAthletes.push({
            id: user._id.toString(),
            name: user.name,
            sport: perf.sport,
            country: "Earth Athlete", // Default country representation
            points: perf.points,
            speed: perf.speed,
            stamina: perf.stamina,
            endurance: perf.endurance,
            recovery: perf.recovery,
            readiness: perf.readiness,
            fatigue: perf.fatigue,
            photo: "🎖️"
          });
        }
      }
    } else {
      // Fallback: merge local registrations which have performances
      const { localUsers } = await import("./auth.js");
      for (const user of localUsers) {
        // Skip default template duplicate usain
        if (user.email === "usain@example.com") continue;
        const perf = localPerformances
          .filter(p => p.userId === user._id)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

        if (perf) {
          activeAthletes.push({
            id: user._id,
            name: user.name,
            sport: perf.sport,
            country: "Global Champion",
            points: perf.points,
            speed: perf.speed,
            stamina: perf.stamina,
            endurance: perf.endurance,
            recovery: perf.recovery,
            readiness: perf.readiness,
            fatigue: perf.fatigue,
            photo: "🏃‍♂️"
          });
        }
      }
    }

    // Sort by points desc
    activeAthletes.sort((a, b) => b.points - a.points);

    return res.json({ athletes: activeAthletes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
