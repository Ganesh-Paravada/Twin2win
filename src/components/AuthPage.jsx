import React, { useState } from "react";
import { Trophy, Activity, ShieldAlert, Award, UserPlus, LogIn, ClipboardList } from "lucide-react";

export default function AuthPage({ onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState("login");
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register Form State
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerAge, setRegisterAge] = useState("");
  const [registerGender, setRegisterGender] = useState("");
  const [registerHeight, setRegisterHeight] = useState("");
  const [registerWeight, setRegisterWeight] = useState("");
  const [registerSport, setRegisterSport] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");

  // Error/Success state
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP logic states
  const [useOtpLogin, setUseOtpLogin] = useState(false);
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState("");

  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [registerOtpCode, setRegisterOtpCode] = useState("");

  // Forgot Password / Password Reset state
  const [resetStep, setResetStep] = useState("request"); // "request" | "verify"
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger reset verification code.");
      }
      setSuccessMsg(data.message || "A verification code has been dispatched. Check your inbox!");
      setResetStep("verify");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e) => {
    e.preventDefault();
    if (!resetOtpCode || !newPassword || !confirmNewPassword) {
      setErrorMsg("All fields are required.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtpCode,
          newPassword
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }
      setSuccessMsg(data.message || "Password successfully changed!");
      // Reset variables & redirect to login
      setTimeout(() => {
        setResetStep("request");
        setResetEmail("");
        setResetOtpCode("");
        setNewPassword("");
        setConfirmNewPassword("");
        setActiveTab("login");
        setErrorMsg("");
        setSuccessMsg("");
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginOtp = async () => {
    if (!loginEmail) {
      setErrorMsg("Please enter your registered email address first.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, action: "login" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger OTP delivery.");
      }

      setLoginOtpSent(true);
      setSuccessMsg("Verification code sent. Please check your inbox.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (useOtpLogin) {
      if (!loginEmail || !loginOtpCode) {
        setErrorMsg("Please provide both email and the 6-digit verification code.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/auth/verify-login-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, otp: loginOtpCode }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "OTP verification failed.");
        }

        setSuccessMsg("OTP Verified! Authenticated successfully.");
        setTimeout(() => {
          onAuthSuccess(data.user, data.token);
        }, 500);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!loginEmail || !loginPassword) {
        setErrorMsg("Please fill in all fields.");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Authentication failed.");
        }

        setSuccessMsg("Logged in successfully!");
        setTimeout(() => {
          onAuthSuccess(data.user, data.token);
        }, 500);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendRegisterOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (
      !registerName ||
      !registerEmail ||
      !registerAge ||
      !registerGender ||
      !registerHeight ||
      !registerWeight ||
      !registerSport ||
      !registerPassword
    ) {
      setErrorMsg("Please fill in all profile details before requesting code.");
      return;
    }

    if (registerPassword !== registerConfirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (registerPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registerEmail, action: "register" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to dispatch registration verification code.");
      }

      setRegisterOtpSent(true);
      setSuccessMsg("A 6-digit verification code was sent. Please check your inbox.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!registerOtpCode) {
      setErrorMsg("Please enter the 6-digit code sent to your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          age: Number(registerAge),
          gender: registerGender,
          height: Number(registerHeight),
          weight: Number(registerWeight),
          sport: registerSport,
          password: registerPassword,
          otp: registerOtpCode
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to complete account registration.");
      }

      setSuccessMsg("Profile verified & account activated! Welcome!");
      setTimeout(() => {
        onAuthSuccess(data.user, data.token);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-height-screen w-full flex align-center justify-center p-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-300">
        
        {/* Logo brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-2 text-blue-600 dark:text-blue-400">
            <Activity className="h-8 w-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Twin2Win</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Digital Twin Athlete Performance</p>
        </div>

        {/* Tab Selection */}
        {activeTab !== "forgot" && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setActiveTab("login"); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                activeTab === "login"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
            <button
              onClick={() => { setActiveTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                activeTab === "register"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Register
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm rounded-xl flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-center gap-2 animate-bounce">
            <Award className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                required
              />
            </div>

            {useOtpLogin ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">6-Digit Verification Code</label>
                    <input
                      type="text"
                      maxLength="6"
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full px-4 py-3 text-center tracking-widest font-black rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendLoginOtp}
                      className="px-4 py-3 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-900 font-extrabold rounded-xl h-[46px]"
                    >
                      {loginOtpSent ? "Resend Key" : "Send OTP"}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Passwordless login for your athlete profile.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs my-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("forgot");
                  setResetStep("request");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-[11px] font-extrabold text-slate-400 hover:text-blue-500 hover:underline uppercase tracking-wider transition"
              >
                Forgot Password?
              </button>

              <button
                type="button"
                onClick={() => {
                  setUseOtpLogin(!useOtpLogin);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-[11px] font-extrabold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 underline uppercase tracking-wider transition"
              >
                {useOtpLogin ? "Use Standard Password" : "Login with OTP"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 active:scale-98 transition duration-150 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : useOtpLogin ? "Verify Code & Sign In" : "Login to Profile"}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {activeTab === "forgot" && (
          <form onSubmit={resetStep === "request" ? handleRequestReset : handleCompleteReset} className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-1 text-center">
              {resetStep === "request" ? "Recover Account" : "Set New Password"}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-3 text-center">
              {resetStep === "request" 
                ? "Enter your registered email address below, and we will dispatch a confidential 6-digit password reset key to your inbox."
                : `Enter the validation key dispatched to ${resetEmail} and specify a new athletic profile password.`}
            </p>

            {resetStep === "request" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                  required
                />
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-4 py-3 text-center tracking-[4px] font-black rounded-xl border-2 border-blue-500 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-xs mt-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setResetStep("request");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-[11px] font-extrabold text-blue-500 hover:underline uppercase tracking-wider"
              >
                ← Back to Login
              </button>

              {resetStep === "verify" && (
                <button
                  type="button"
                  onClick={handleRequestReset}
                  disabled={loading}
                  className="text-[11px] font-extrabold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider"
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 font-black text-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-lg active:scale-98 transition duration-150 disabled:opacity-50"
            >
              {loading 
                ? "Processing..." 
                : resetStep === "request" 
                  ? "Send Password Reset Code" 
                  : "Complete Password Reset"}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === "register" && (
          <form onSubmit={registerOtpSent ? handleRegister : handleSendRegisterOtp} className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {!registerOtpSent ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Usain Bolt"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="usain@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Age</label>
                    <input
                      type="number"
                      value={registerAge}
                      onChange={(e) => setRegisterAge(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="25"
                      min="12"
                      max="100"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                    <select
                      value={registerGender}
                      onChange={(e) => setRegisterGender(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                      required
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={registerHeight}
                      onChange={(e) => setRegisterHeight(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="175"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={registerWeight}
                      onChange={(e) => setRegisterWeight(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="70"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Primary Sport</label>
                  <select
                    value={registerSport}
                    onChange={(e) => setRegisterSport(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  >
                    <option value="">Select your sport</option>
                    <option value="Running">🏃 Running</option>
                    <option value="Football">⚽ Football</option>
                    <option value="Basketball">🏀 Basketball</option>
                    <option value="Tennis">🎾 Tennis</option>
                    <option value="Badminton">🏸 Badminton</option>
                    <option value="Athletics">🏅 Athletics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Password</label>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Create a password (min 6 chars)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-2 font-black text-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 active:scale-98 transition duration-150 disabled:opacity-50"
                >
                  {loading ? "Verifying data..." : "Get Emailed OTP Code"}
                </button>
              </>
            ) : (
              <div className="space-y-4 py-4 animate-fade-in text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-extrabold mb-1">
                  📧
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-850 dark:text-white">Verify Your Mail Identity</h3>
                  <p className="text-xs text-slate-400 mt-1">We sent a real 6-digit confirmation to {registerEmail}</p>
                </div>

                <div className="max-w-[190px] mx-auto">
                  <input
                    type="text"
                    maxLength="6"
                    value={registerOtpCode}
                    onChange={(e) => setRegisterOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center tracking-[6px] text-lg font-black px-4 py-3 rounded-xl border-2 border-blue-500 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 font-black text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg active:scale-98 transition duration-150 disabled:opacity-50"
                >
                  {loading ? "Validating OTP..." : "Verify & Complete Registration"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegisterOtpSent(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline mt-2 block mx-auto"
                >
                  Change Email / edit credentials
                </button>
              </div>
            )}
          </form>
        )}

      </div>
    </div>
  );
}
