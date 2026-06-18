import React, { useMemo, useState } from "react";
import { ArrowDownUp, Medal, Search, Trophy } from "lucide-react";

const SPORTS = ["Running", "Football", "Basketball", "Tennis", "Athletics", "Badminton"];

const fallbackAthletes = [
  { id: "run-1", name: "Maya Singh", sport: "Running", points: 932 },
  { id: "foot-1", name: "Leo Martins", sport: "Football", points: 918 },
  { id: "basket-1", name: "Jordan Blake", sport: "Basketball", points: 904 },
  { id: "tennis-1", name: "Ava Chen", sport: "Tennis", points: 896 },
  { id: "ath-1", name: "Noah Carter", sport: "Athletics", points: 887 },
  { id: "bad-1", name: "Ishaan Rao", sport: "Badminton", points: 873 },
  { id: "run-2", name: "Sofia Okafor", sport: "Running", points: 862 },
  { id: "foot-2", name: "Mateo Silva", sport: "Football", points: 851 },
  { id: "basket-2", name: "Nia Brooks", sport: "Basketball", points: 834 },
  { id: "tennis-2", name: "Elena Petrova", sport: "Tennis", points: 821 },
  { id: "ath-2", name: "Arjun Mehta", sport: "Athletics", points: 808 },
  { id: "bad-2", name: "Mina Park", sport: "Badminton", points: 796 },
];

function normalizeAthlete(athlete, index) {
  return {
    id: athlete.id || athlete._id || `${athlete.name}-${index}`,
    name: athlete.name || "Athlete",
    sport: SPORTS.includes(athlete.sport) ? athlete.sport : "Athletics",
    points: Number(athlete.points) || 0,
  };
}

function rankClass(rank) {
  if (rank === 1) return "border-amber-300/40 bg-amber-300/15 text-amber-200";
  if (rank === 2) return "border-slate-200/35 bg-slate-200/12 text-slate-100";
  if (rank === 3) return "border-orange-300/35 bg-orange-300/12 text-orange-200";
  return "border-white/10 bg-white/[0.04] text-slate-300";
}

export default function LeaderboardView({ athletes }) {
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("All");
  const [sortBy, setSortBy] = useState("desc");

  const mergedAthletes = useMemo(() => {
    const map = new Map();
    [...fallbackAthletes, ...(athletes || [])].forEach((athlete, index) => {
      const normalized = normalizeAthlete(athlete, index);
      const key = `${normalized.name}-${normalized.sport}`;
      const existing = map.get(key);
      if (!existing || normalized.points > existing.points) {
        map.set(key, normalized);
      }
    });
    return [...map.values()];
  }, [athletes]);

  const visibleAthletes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return mergedAthletes
      .filter((athlete) => sportFilter === "All" || athlete.sport === sportFilter)
      .filter((athlete) => !term || athlete.name.toLowerCase().includes(term))
      .sort((a, b) => (sortBy === "desc" ? b.points - a.points : a.points - b.points));
  }, [mergedAthletes, search, sportFilter, sortBy]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-400/10 p-2 text-violet-300">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Leaderboard</h2>
            <p className="text-sm text-slate-400">Athlete ranking by performance points.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[650px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search athlete"
              className="h-11 w-full rounded-lg border border-white/10 bg-black/20 pl-10 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
            />
          </label>

          <label className="relative">
            <Medal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              value={sportFilter}
              onChange={(event) => setSportFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-white/10 bg-black/20 pl-10 pr-3 text-sm font-bold text-white outline-none transition focus:border-sky-400/60"
            >
              <option>All</option>
              {SPORTS.map((sport) => (
                <option key={sport}>{sport}</option>
              ))}
            </select>
          </label>

          <label className="relative">
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-white/10 bg-black/20 pl-10 pr-3 text-sm font-bold text-white outline-none transition focus:border-sky-400/60"
            >
              <option value="desc">Top to Bottom</option>
              <option value="asc">Bottom to Top</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-white/[0.04] text-xs font-black uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-4">Rank</th>
              <th className="px-4 py-4">Athlete Name</th>
              <th className="px-4 py-4">Sport</th>
              <th className="px-4 py-4 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {visibleAthletes.map((athlete, index) => {
              const rank = index + 1;
              return (
                <tr key={athlete.id} className="transition hover:bg-white/[0.04]">
                  <td className="px-4 py-4">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-black ${rankClass(rank)}`}>
                      {rank}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-black text-white">{athlete.name}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-lg border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-bold text-sky-200">
                      {athlete.sport}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-black text-violet-200">{athlete.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
