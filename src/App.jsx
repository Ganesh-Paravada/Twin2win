import React, { useEffect, useState } from "react";
import AuthPage from "./components/AuthPage";
import DashboardView from "./components/DashboardView";
import LeaderboardView from "./components/LeaderboardView";
import AICoachView from "./components/AICoachView";
import { Activity, LogOut, Menu, X } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [history, setHistory] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");

    const token = localStorage.getItem("twin2win_token");
    const savedUser = localStorage.getItem("twin2win_user");

    if (token && savedUser) {
      try {
        setAuthToken(token);
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("twin2win_token");
        localStorage.removeItem("twin2win_user");
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    if (currentUser && authToken) {
      fetchHistory();
    }
  }, [currentUser, authToken]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/coach/history", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      setHistory([]);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/coach/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setAthletes(data.athletes || []);
      }
    } catch {
      setAthletes([]);
    }
  };

  const handleAuthSuccess = (user, token) => {
    localStorage.setItem("twin2win_token", token);
    localStorage.setItem("twin2win_user", JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    window.speechSynthesis?.cancel();
    localStorage.removeItem("twin2win_token");
    localStorage.removeItem("twin2win_user");
    setAuthToken("");
    setCurrentUser(null);
    setHistory([]);
  };

  const handleAnalysisSuccess = (entry) => {
    setHistory((prev) => [entry, ...prev]);
    fetchLeaderboard();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A14] text-white flex items-center justify-center">
        <Activity className="h-8 w-8 animate-pulse text-sky-400" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#070A14] text-slate-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(147,51,234,0.16),transparent_30%)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070A14]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">Twin2Win</h1>
              <p className="text-xs font-semibold text-slate-400">Digital Twin Athlete Performance</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 text-xs font-bold text-slate-300 md:flex">
            <a className="rounded-lg px-3 py-2 hover:bg-white/10" href="#insights">Insights</a>
            <a className="rounded-lg px-3 py-2 hover:bg-white/10" href="#rankings">Rankings</a>
            <a className="rounded-lg px-3 py-2 hover:bg-white/10" href="#report">AI Report</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 px-4 pb-4 md:hidden">
            <div className="grid gap-2 pt-3 text-sm font-bold text-slate-300">
              <a onClick={() => setMobileOpen(false)} className="rounded-lg bg-white/5 px-3 py-2" href="#insights">Insights</a>
              <a onClick={() => setMobileOpen(false)} className="rounded-lg bg-white/5 px-3 py-2" href="#rankings">Rankings</a>
              <a onClick={() => setMobileOpen(false)} className="rounded-lg bg-white/5 px-3 py-2" href="#report">AI Report</a>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <section id="insights">
          <DashboardView user={currentUser} history={history} athletes={athletes} />
        </section>

        <section id="rankings">
          <LeaderboardView athletes={athletes} />
        </section>

        <section id="report">
          <AICoachView
            user={currentUser}
            token={authToken}
            athletes={athletes}
            onAnalysisSuccess={handleAnalysisSuccess}
          />
        </section>
      </main>
    </div>
  );
}
