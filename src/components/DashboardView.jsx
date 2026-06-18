import React from "react";
import { Activity, Battery, Gauge, HeartPulse, ShieldCheck, TrendingUp } from "lucide-react";

const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

function scoreFromRecord(record) {
  if (!record) return 78;
  return Math.round((clamp(record.speed) + clamp(record.stamina) + clamp(record.endurance) + clamp(record.readiness)) / 4);
}

function initials(name = "Athlete") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Ring({ value, tone = "sky" }) {
  const safe = clamp(value);
  const color = tone === "violet" ? "#a78bfa" : tone === "emerald" ? "#34d399" : tone === "rose" ? "#fb7185" : "#38bdf8";

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="9"
          strokeDasharray={`${safe * 2.64} 264`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">{safe}</div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint, tone }) {
  const safe = clamp(value);
  const toneClasses = {
    sky: "text-sky-300 bg-sky-400/10",
    violet: "text-violet-300 bg-violet-400/10",
    emerald: "text-emerald-300 bg-emerald-400/10",
    rose: "text-rose-300 bg-rose-400/10",
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{safe}</p>
        </div>
        <div className={`rounded-lg p-2 ${toneClasses[tone] || toneClasses.sky}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${
            tone === "violet"
              ? "bg-violet-400"
              : tone === "emerald"
                ? "bg-emerald-400"
                : tone === "rose"
                  ? "bg-rose-400"
                  : "bg-sky-400"
          }`}
          style={{ width: `${safe}%` }}
        />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">{hint}</p>
    </div>
  );
}

export default function DashboardView({ user, history, athletes }) {
  const latest = history?.[0];
  const leaderboardMatch = athletes?.find((athlete) => athlete.name === user.name);
  const profile = latest || leaderboardMatch || {};

  const performanceScore = scoreFromRecord(profile);
  const fatigueScore = clamp(profile.fatigue ?? 18);
  const enduranceScore = clamp(profile.endurance ?? 76);
  const readinessScore = clamp(profile.readiness ?? Math.max(58, performanceScore - Math.round(fatigueScore / 4)));
  const sport = profile.sport || user.sport || "Running";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1.95fr]">
      <div className="rounded-lg border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-sky-400/10 p-2 text-sky-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-white">Athlete Profile</h2>
            <p className="text-xs font-medium text-slate-400">Performance snapshot</p>
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 h-32 w-32 overflow-hidden rounded-lg border border-sky-300/25 bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 shadow-xl shadow-sky-950/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_20%,rgba(255,255,255,0.28),transparent_26%)]" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-black/18" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white">
              {initials(user.name)}
            </div>
          </div>

          <h3 className="text-2xl font-black tracking-tight text-white">{user.name}</h3>
          <p className="mt-1 text-sm font-bold text-sky-300">{sport}</p>

          <div className="mt-7 flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Overall Score</p>
              <p className="mt-1 text-sm font-semibold text-slate-300">
                {performanceScore >= 88 ? "Elite form" : performanceScore >= 75 ? "Strong form" : "Building form"}
              </p>
            </div>
            <Ring value={performanceScore} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Key Performance Metrics</h2>
            <p className="mt-1 text-sm text-slate-400">Four athlete-focused scores from the latest performance.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 md:flex">
            <TrendingUp className="h-4 w-4 text-sky-300" />
            Live readiness view
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Gauge}
            label="Performance Score"
            value={performanceScore}
            hint="Combined athletic output"
            tone="sky"
          />
          <MetricCard
            icon={Battery}
            label="Fatigue Score"
            value={fatigueScore}
            hint="Lower is easier to recover"
            tone="rose"
          />
          <MetricCard
            icon={Activity}
            label="Endurance Score"
            value={enduranceScore}
            hint="Sustained effort quality"
            tone="violet"
          />
          <MetricCard
            icon={HeartPulse}
            label="Readiness Score"
            value={readinessScore}
            hint="Preparedness to train"
            tone="emerald"
          />
        </div>
      </div>
    </div>
  );
}
