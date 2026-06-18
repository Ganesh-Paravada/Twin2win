import React, { useMemo, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { Check, CloudUpload, Loader2, Square, Upload, Volume2, X } from "lucide-react";
import ThreeAvatar from "./ThreeAvatar";

const referenceRecords = [
  { name: "Elite Sprint Profile", sport: "Running", speed: 97, stamina: 84, endurance: 80, readiness: 92, fatigue: 13, style: "explosive acceleration and race pace control" },
  { name: "Stamina Specialist Profile", sport: "Running", speed: 82, stamina: 98, endurance: 99, readiness: 95, fatigue: 9, style: "stamina, pacing discipline, and late-session efficiency" },
  { name: "Football Pace Profile", sport: "Football", speed: 92, stamina: 86, endurance: 83, readiness: 90, fatigue: 14, style: "repeat sprints, fast direction changes, and match tempo" },
  { name: "Basketball Burst Profile", sport: "Basketball", speed: 88, stamina: 82, endurance: 80, readiness: 86, fatigue: 18, style: "vertical power, short bursts, and fast recovery between plays" },
  { name: "Tennis Agility Profile", sport: "Tennis", speed: 84, stamina: 88, endurance: 84, readiness: 88, fatigue: 16, style: "lateral movement, balance, and repeat acceleration" },
  { name: "Developing Fitness Profile", sport: "Athletics", speed: 68, stamina: 64, endurance: 62, readiness: 66, fatigue: 34, style: "stamina rebuilding, recovery quality, and controlled workload" },
  { name: "Badminton Reaction Profile", sport: "Badminton", speed: 86, stamina: 84, endurance: 78, readiness: 87, fatigue: 15, style: "reaction speed, first-step movement, and court coverage" },
];

const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const avg = (values) => Math.round(values.reduce((sum, value) => sum + clamp(value), 0) / values.length);
let poseDetectorPromise = null;

function getPoseDetector() {
  if (!poseDetectorPromise) {
    poseDetectorPromise = (async () => {
      await tf.setBackend("webgl");
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })();
  }
  return poseDetectorPromise;
}

function keypointMap(pose) {
  return Object.fromEntries((pose?.keypoints || []).map((point) => [point.name, point]));
}

function usable(point) {
  return point && (point.score ?? 0) >= 0.25;
}

function angleBetween(a, b, c) {
  if (!usable(a) || !usable(b) || !usable(c)) return null;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magA = Math.hypot(ab.x, ab.y);
  const magC = Math.hypot(cb.x, cb.y);
  if (!magA || !magC) return null;
  const cosine = Math.max(-1, Math.min(1, dot / (magA * magC)));
  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

function torsoLeanAngle(leftShoulder, rightShoulder, leftHip, rightHip) {
  if (![leftShoulder, rightShoulder, leftHip, rightHip].every(usable)) return null;
  const shoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const hip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };
  const dx = shoulder.x - hip.x;
  const dy = hip.y - shoulder.y;
  return Math.round(Math.abs((Math.atan2(dx, dy) * 180) / Math.PI));
}

function averageNumber(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function collectPoseAngles(pose) {
  const points = keypointMap(pose);
  const leftKnee = angleBetween(points.left_hip, points.left_knee, points.left_ankle);
  const rightKnee = angleBetween(points.right_hip, points.right_knee, points.right_ankle);
  const leftHip = angleBetween(points.left_shoulder, points.left_hip, points.left_knee);
  const rightHip = angleBetween(points.right_shoulder, points.right_hip, points.right_knee);
  const leftElbow = angleBetween(points.left_shoulder, points.left_elbow, points.left_wrist);
  const rightElbow = angleBetween(points.right_shoulder, points.right_elbow, points.right_wrist);

  return {
    kneeAngle: averageNumber([leftKnee, rightKnee]),
    hipAngle: averageNumber([leftHip, rightHip]),
    elbowAngle: averageNumber([leftElbow, rightElbow]),
    torsoLean: torsoLeanAngle(points.left_shoulder, points.right_shoulder, points.left_hip, points.right_hip),
    confidence: Number((pose?.score || 0).toFixed(3)),
  };
}

function summarizeAngleFrames(frames) {
  const validFrames = frames.filter((frame) => frame && frame.confidence >= 0.2);
  const summarize = (key) => {
    const values = validFrames.map((frame) => frame[key]).filter((value) => Number.isFinite(value));
    if (!values.length) return null;
    return {
      avg: averageNumber(values),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  };

  return {
    detectedFrames: validFrames.length,
    kneeAngle: summarize("kneeAngle"),
    hipAngle: summarize("hipAngle"),
    elbowAngle: summarize("elbowAngle"),
    torsoLean: summarize("torsoLean"),
    confidence: Number((
      validFrames.reduce((sum, frame) => sum + frame.confidence, 0) / Math.max(1, validFrames.length)
    ).toFixed(3)),
  };
}

function metricDistance(a, b) {
  const sportPenalty = a.sport === b.sport ? 0 : 12;
  return (
    Math.abs(clamp(a.speed) - clamp(b.speed)) +
    Math.abs(clamp(a.stamina) - clamp(b.stamina)) +
    Math.abs(clamp(a.endurance) - clamp(b.endurance)) +
    Math.abs(clamp(a.readiness) - clamp(b.readiness)) +
    Math.abs(clamp(a.fatigue) - clamp(b.fatigue)) +
    sportPenalty
  );
}

function uniqueFive(items) {
  const seen = new Set();
  const clean = items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  while (clean.length < 5) {
    clean.push(clean.length % 2 === 0 ? "Hold consistent technique through the final training phase." : "Improve recovery rhythm before the next high-load session.");
  }
  return clean.slice(0, 5);
}

function waitForVideoEvent(video, eventName) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Unable to read this video file."));
    };
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

async function extractVideoMetrics(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await waitForVideoEvent(video, "loadedmetadata");

    const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
    if (!durationSeconds || durationSeconds < 1) {
      throw new Error("Use a video clip that is at least one second long.");
    }

    const canvas = document.createElement("canvas");
    const width = 96;
    const height = 54;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Video frame analysis is unavailable in this browser.");

    const sampleCount = Math.min(18, Math.max(6, Math.floor(durationSeconds * 2)));
    const poseDetector = await getPoseDetector();
    let previous = null;
    const motionValues = [];
    const brightnessValues = [];
    const edgeValues = [];
    const poseAngleFrames = [];

    for (let index = 0; index < sampleCount; index += 1) {
      const t = sampleCount === 1 ? 0 : (durationSeconds * index) / (sampleCount - 1);
      video.currentTime = Math.min(durationSeconds - 0.05, Math.max(0, t));
      await waitForVideoEvent(video, "seeked");

      context.drawImage(video, 0, 0, width, height);
      const poses = await poseDetector.estimatePoses(video, { flipHorizontal: false });
      const angles = collectPoseAngles(poses[0]);
      if (
        angles.confidence >= 0.2 &&
        [angles.kneeAngle, angles.hipAngle, angles.elbowAngle, angles.torsoLean].some((value) => Number.isFinite(value))
      ) {
        poseAngleFrames.push({ frame: index + 1, time: Number(t.toFixed(2)), ...angles });
      }

      const frame = context.getImageData(0, 0, width, height).data;
      const grayscale = new Float32Array(width * height);
      let brightnessTotal = 0;

      for (let pixel = 0, grayIndex = 0; pixel < frame.length; pixel += 4, grayIndex += 1) {
        const gray = (frame[pixel] * 0.299 + frame[pixel + 1] * 0.587 + frame[pixel + 2] * 0.114) / 255;
        grayscale[grayIndex] = gray;
        brightnessTotal += gray;
      }

      brightnessValues.push(brightnessTotal / grayscale.length);

      let edgeTotal = 0;
      for (let y = 1; y < height; y += 1) {
        for (let x = 1; x < width; x += 1) {
          const pos = y * width + x;
          edgeTotal += Math.abs(grayscale[pos] - grayscale[pos - 1]) + Math.abs(grayscale[pos] - grayscale[pos - width]);
        }
      }
      edgeValues.push(edgeTotal / ((width - 1) * (height - 1) * 2));

      if (previous) {
        let diffTotal = 0;
        let activePixels = 0;
        for (let i = 0; i < grayscale.length; i += 1) {
          const diff = Math.abs(grayscale[i] - previous[i]);
          diffTotal += diff;
          if (diff > 0.08) activePixels += 1;
        }
        motionValues.push({
          intensity: diffTotal / grayscale.length,
          density: activePixels / grayscale.length,
        });
      }

      previous = grayscale;
    }

    if (motionValues.length < 3) {
      throw new Error("The video does not have enough frame variation to score performance.");
    }

    const poseAngles = summarizeAngleFrames(poseAngleFrames);
    if (poseAngles.detectedFrames < 3 || !poseAngles.kneeAngle || !poseAngles.hipAngle || !poseAngles.torsoLean) {
      throw new Error("Pose detection needs at least 3 clear full-body frames to calculate scoring angles.");
    }

    const motionSeries = motionValues.map((item) => item.intensity);
    const densitySeries = motionValues.map((item) => item.density);
    const meanMotion = motionSeries.reduce((sum, value) => sum + value, 0) / motionSeries.length;
    const meanDensity = densitySeries.reduce((sum, value) => sum + value, 0) / densitySeries.length;
    const motionVariance = motionSeries.reduce((sum, value) => sum + Math.abs(value - meanMotion), 0) / motionSeries.length;
    const brightness = brightnessValues.reduce((sum, value) => sum + value, 0) / brightnessValues.length;
    const edgeActivity = edgeValues.reduce((sum, value) => sum + value, 0) / edgeValues.length;

    return {
      durationSeconds: Number(durationSeconds.toFixed(2)),
      sampleCount,
      motionIntensity: Number(Math.min(1, meanMotion * 8).toFixed(4)),
      activityDensity: Number(Math.min(1, meanDensity * 2.8).toFixed(4)),
      motionConsistency: Number(Math.max(0, Math.min(1, 1 - motionVariance * 9)).toFixed(4)),
      stability: Number(Math.max(0, Math.min(1, 1 - motionVariance * 6)).toFixed(4)),
      lightingQuality: Number(Math.max(0, Math.min(1, 1 - Math.abs(brightness - 0.52) * 1.9)).toFixed(4)),
      edgeActivity: Number(Math.min(1, edgeActivity * 5).toFixed(4)),
      poseAngles,
      poseAngleFrames: poseAngleFrames.slice(0, 8),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function createRagReport(result, user, athletes) {
  const metrics = {
    sport: result.sport || user.sport || "Running",
    speed: clamp(result.speed),
    stamina: clamp(result.stamina),
    endurance: clamp(result.endurance),
    readiness: clamp(result.readiness),
    fatigue: clamp(result.fatigue),
  };

  const athleteRecords = (athletes || []).map((athlete) => ({
    name: athlete.name,
    sport: athlete.sport,
    speed: clamp(athlete.speed || avg([athlete.points / 10, 72])),
    stamina: clamp(athlete.stamina || avg([athlete.points / 10, 70])),
    endurance: clamp(athlete.endurance || avg([athlete.points / 10, 68])),
    readiness: clamp(athlete.readiness || avg([athlete.points / 10, 74])),
    fatigue: clamp(athlete.fatigue || Math.max(8, 42 - athlete.points / 30)),
    style: `${athlete.sport} performance profile`,
  }));

  const retrieved = [...referenceRecords, ...athleteRecords]
    .sort((a, b) => metricDistance(metrics, a) - metricDistance(metrics, b))
    .slice(0, 3);

  const closest = retrieved[0] || referenceRecords[0];
  const performanceScore = avg([metrics.speed, metrics.stamina, metrics.endurance, metrics.readiness]);

  const strengths = [];
  const weaknesses = [];

  if (metrics.speed >= 88) strengths.push(`Acceleration profile resembles ${closest.name}, with sharp first-phase pace.`);
  if (metrics.speed >= 78) strengths.push("Stride tempo stays competitive during high-intensity movement.");
  if (metrics.stamina >= 86) strengths.push("Sustains effort well across repeated phases of play.");
  if (metrics.readiness >= 86) strengths.push("Readiness is strong enough for demanding training loads.");
  if (metrics.fatigue <= 18) strengths.push("Fatigue control suggests efficient recovery between efforts.");
  if (performanceScore >= 82) strengths.push(`Overall pattern aligns with ${closest.style}.`);
  if (metrics.sport === "Football" && metrics.speed >= 82) strengths.push("Repeat sprint ability is a clear match-day advantage.");
  if (metrics.sport === "Tennis" && metrics.readiness >= 80) strengths.push("Court movement readiness supports fast directional resets.");
  if (metrics.sport === "Badminton" && metrics.speed >= 80) strengths.push("First-step reaction quality supports aggressive court coverage.");

  if (metrics.speed < 78) weaknesses.push("Improve acceleration mechanics with shorter, faster ground contact.");
  if (metrics.stamina < 80) weaknesses.push("Build stamina through controlled interval blocks and steady pacing.");
  if (metrics.readiness < 78) weaknesses.push("Reduce training load until readiness returns to a stronger range.");
  if (metrics.fatigue > 24) weaknesses.push("Prioritize recovery habits to lower fatigue before intense work.");
  if (performanceScore < 76) weaknesses.push(`Current profile is closer to developing records than elite ${metrics.sport} benchmarks.`);
  if (metrics.sport === "Running" && metrics.stamina < 84) weaknesses.push("Add aerobic threshold sessions to protect pace after the opening phase.");
  if (metrics.sport === "Basketball" && metrics.fatigue > 20) weaknesses.push("Recovery between bursts needs work to protect jump quality.");
  if (metrics.sport === "Tennis" && metrics.speed < 82) weaknesses.push("Sharpen first-step speed for wider baseline coverage.");
  if (metrics.sport === "Badminton" && metrics.readiness < 84) weaknesses.push("Improve readiness before high-tempo reaction sessions.");

  return {
    performanceScore,
    retrieved,
    strengths: uniqueFive(strengths),
    weaknesses: uniqueFive(weaknesses),
    scoringEvidence: result.scoringEvidence || null,
  };
}

export default function AICoachView({ user, token, athletes, onAnalysisSuccess }) {
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileRef = useRef(null);

  const reportText = useMemo(() => {
    if (!report) return "";
    return [
      "Top 5 strengths.",
      ...report.strengths.map((item, index) => `${index + 1}. ${item}`),
      "Areas for improvement.",
      ...report.weaknesses.map((item, index) => `${index + 1}. ${item}`),
    ].join(" ");
  }, [report]);

  const setupVideo = (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setVideoFile(file);
    setReport(null);
    setAnalysis(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setVideoFile(null);
    setReport(null);
    setAnalysis(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const analyzeVideo = async () => {
    if (!videoFile) return;
    setIsAnalyzing(true);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    try {
      const videoMetrics = await extractVideoMetrics(videoFile);
      const response = await fetch("/api/coach/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sport: user.sport,
          videoName: videoFile.name,
          videoMetrics,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Video analysis failed.");

      const generatedReport = createRagReport(data, user, athletes);
      setAnalysis(data);
      setReport(generatedReport);
      onAnalysisSuccess({ ...data, performanceScore: generatedReport.performanceScore });
    } catch (error) {
      alert(error.message || "Video analysis failed. Please try another clear performance clip.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hearFeedback = () => {
    if (!reportText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reportText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.55fr]">
      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black tracking-tight text-white">Video Analysis</h2>
          <p className="mt-1 text-sm text-slate-400">Upload a performance clip to generate athlete-specific feedback.</p>
        </div>

        <div className="mb-5 overflow-hidden rounded-lg border border-white/10">
          <ThreeAvatar />
        </div>

        {!videoFile ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed border-sky-300/35 bg-sky-300/5 p-6 text-center transition hover:border-sky-300/70 hover:bg-sky-300/10"
          >
            <CloudUpload className="mb-4 h-10 w-10 text-sky-300" />
            <span className="text-sm font-black text-white">Upload Video</span>
            <span className="mt-2 text-xs font-medium text-slate-400">MP4, MOV, or WebM</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
              <video src={previewUrl} controls className="aspect-video w-full object-contain" />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <button
                type="button"
                onClick={analyzeVideo}
                disabled={isAnalyzing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-violet-500 px-4 text-sm font-black text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-60"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isAnalyzing ? "Analyzing" : "Analyze Video"}
              </button>
              <button
                type="button"
                onClick={clearVideo}
                disabled={isAnalyzing}
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
                aria-label="Clear video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => setupVideo(event.target.files?.[0])}
        />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-6">
        <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">AI Performance Report</h2>
            <p className="mt-1 text-sm text-slate-400">Generated from video metrics and similar athlete records.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={hearFeedback}
              disabled={!report || isSpeaking}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-400 px-3 text-xs font-black text-slate-950 transition hover:bg-sky-300 disabled:opacity-45"
            >
              <Volume2 className="h-4 w-4" />
              Hear Feedback
            </button>
            <button
              type="button"
              onClick={stopVoice}
              disabled={!isSpeaking}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-45"
            >
              <Square className="h-4 w-4" />
              Stop Voice
            </button>
          </div>
        </div>

        {!report ? (
          <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/15 text-center">
            <div>
              <p className="text-sm font-black text-white">Report appears after video analysis.</p>
              <p className="mt-2 text-xs font-medium text-slate-400">Strengths and weaknesses change with each athlete profile and score.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] p-5">
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-emerald-200">Top 5 Strengths</h3>
              <div className="space-y-3">
                {report.strengths.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-lg bg-black/18 p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm font-semibold leading-6 text-slate-100">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-rose-300/15 bg-rose-300/[0.055] p-5">
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-rose-200">Areas For Improvement</h3>
              <div className="space-y-3">
                {report.weaknesses.map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg bg-black/18 p-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                    <p className="text-sm font-semibold leading-6 text-slate-100">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {analysis && (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["Performance", report?.performanceScore],
              ["Fatigue", analysis.fatigue],
              ["Readiness", analysis.readiness],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/18 p-3">
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-black text-white">{clamp(value)}</p>
              </div>
            ))}
          </div>
        )}

        {report?.scoringEvidence && (
          <div className="mt-4 rounded-lg border border-sky-300/15 bg-sky-300/[0.055] p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-sky-200">Score Evidence</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {report.scoringEvidence.poseAngles.map((item) => (
                <div key={item.label} className="rounded-lg border border-white/10 bg-black/18 p-3">
                  <p className="text-xs font-bold text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xl font-black text-white">{item.avg}°</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">range {item.min}°-{item.max}°</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {report.scoringEvidence.scoreBreakdown.map((item) => (
                <div key={item.label} className="rounded-lg border border-white/10 bg-black/18 p-3">
                  <p className="text-xs font-bold text-slate-400">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">{report.scoringEvidence.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
