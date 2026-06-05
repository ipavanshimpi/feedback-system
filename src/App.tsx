import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Database,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Vote,
  Compass,
  Zap,
  Lock,
  User
} from "lucide-react";
import { Campaign, FeedbackResponse } from "./types";
import { CampaignCreator } from "./components/CampaignCreator";
import { CampaignList } from "./components/CampaignList";
import { CampaignReport } from "./components/CampaignReport";
import { FeedbackForm } from "./components/FeedbackForm";

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin") {
      sessionStorage.setItem("admin_auth", "true");
      onLogin();
    } else {
      setError("Invalid credentials. Enter admin / admin.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4">
      <div className="ambient-card rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-teal-50 text-teal-650 rounded-2xl flex items-center justify-center mx-auto border border-teal-100">
            <Lock className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h2 className="text-2xl font-black text-neutral-950 tracking-tight">Admin Authentication</h2>
          <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase">Console Security Check</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-450 font-mono tracking-wider uppercase">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-teal-500 bg-neutral-50 focus:bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-450 font-mono tracking-wider uppercase">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-teal-500 bg-neutral-50 focus:bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-500 font-mono text-center pt-1">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-teal-605 text-white font-bold text-xs uppercase tracking-wider font-mono hover:bg-teal-700 active:scale-[0.98] transition cursor-pointer"
          >
            Access Console
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("admin_auth") === "true";
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignMap, setCampaignMap] = useState<Record<string, Campaign>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [activeStudentCampaign, setActiveStudentCampaign] = useState<Campaign | null>(null);
  const [loadingStudentForm, setLoadingStudentForm] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Simple clean Router logic
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState(null, "", to);
    setCurrentPath(to);
  };

  // Fetch campaign lists (For admin overview dashboard)
  const loadCampaigns = async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);

        // Cache map
        const map: Record<string, Campaign> = {};
        data.forEach((c: Campaign) => {
          map[c.id] = c;
        });
        setCampaignMap(map);
      }
    } catch (err) {
      console.error("Failed to load campaigns", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (currentPath === "/admin" || currentPath === "/") {
      loadCampaigns();
    }
  }, [currentPath]);

  // Handle student form fetching dynamically if route matches /f/:id
  const isStudentRoute = currentPath.startsWith("/f/");
  const studentFormId = isStudentRoute ? currentPath.split("/f/")[1] : null;

  useEffect(() => {
    if (isStudentRoute && studentFormId) {
      const fetchStudentCampaign = async () => {
        try {
          setLoadingStudentForm(true);
          setStudentError(null);
          const res = await fetch(`/api/campaigns/${studentFormId}`);
          if (!res.ok) {
            throw new Error("This feedback program could not be located, or may have been archived.");
          }
          const data = await res.json();
          setActiveStudentCampaign(data);
        } catch (err: any) {
          console.error(err);
          setStudentError(err.message || "Failed to load evaluation.");
        } finally {
          setLoadingStudentForm(false);
        }
      };
      fetchStudentCampaign();
    } else {
      setActiveStudentCampaign(null);
    }
  }, [currentPath, isStudentRoute, studentFormId]);

  // Handle students submitting form payload
  const handleStudentSubmit = async (ratings: Record<string, number>, suggestion: string): Promise<FeedbackResponse | null> => {
    if (!studentFormId) return null;
    try {
      const res = await fetch(`/api/campaigns/${studentFormId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ratings,
          suggestion_text: suggestion,
        }),
      });
      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.response || null;
    } catch (err) {
      console.error("Submission error", err);
      return null;
    }
  };

  // Check if we are viewing a specific report: `/admin/:id`
  const isAdminReportRoute = currentPath.startsWith("/admin/") && currentPath !== "/admin";
  const adminReportId = isAdminReportRoute ? currentPath.split("/admin/")[1] : null;

  return (
    <div className="min-h-screen bg-gradient-mesh bg-grid-pattern text-neutral-800 font-sans antialiased selection:bg-primary selection:text-white flex flex-col justify-between">

      {/* Universal Branded Header - Hidden completely in student portal view to remove distractions */}
      {!isStudentRoute && (
        <header className="border-b border-neutral-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.02)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 text-left group hover:opacity-95 transition cursor-pointer"
            >
              <img
                src="/image.png"
                alt="simplesphere"
                className="h-12 w-auto object-contain"
              />
            </button>

            <nav className="flex items-center gap-2">
              <button
                onClick={() => navigate("/admin")}
                className={`py-1.5 px-3.5 rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase border transition duration-155 cursor-pointer ${currentPath.startsWith("/admin")
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-neutral-750 border-neutral-200 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                  }`}
              >
                Control Panel
              </button>
            </nav>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isStudentRoute ? "py-12 flex items-center justify-center min-h-[85vh]" : "py-10"}`}>

        {/* VIEW 1: GATE/HOME GRID */}
        {currentPath === "/" && (
          <div className="space-y-16 py-4">

            {/* Hero Splash banner */}
            <div className="text-center max-w-4xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full text-xs font-bold bg-white border border-neutral-200 shadow-xs text-neutral-600 font-mono">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>GEMINI COURSE EVALUATION CO-PILOT</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-neutral-950 tracking-tight leading-none">
                Autonomous Course Feedback & Metrics
              </h1>

              <p className="text-neutral-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-sans font-medium">
                simplesphere optimizes structural training metrics through Large Language models, allowing students to submit aggregate grades cleanly and 100% anonymously.
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => navigate("/admin")}
                  className="py-4 px-8 bg-teal-605 text-white font-bold text-sm uppercase tracking-wider font-mono rounded-xl hover:bg-teal-700 active:scale-[0.98] transition-all shadow-sm shadow-teal-500/10 hover:shadow-md hover:shadow-teal-500/20 inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Launch Admin Suite</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Showcase Features Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              <div className="ambient-card p-8 rounded-3xl space-y-4">
                <div className="w-10 h-10 bg-neutral-950 text-teal-400 rounded-xl flex items-center justify-center border border-neutral-850 shadow-xs shadow-teal-500/20">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-neutral-900 text-base">Course Assessment</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed font-sans">
                    Evaluate laboratory protocols, compiler pacing, framework configurations, and support layers natively.
                  </p>
                </div>
              </div>

              <div className="ambient-card p-8 rounded-3xl space-y-4">
                <div className="w-10 h-10 bg-neutral-950 text-teal-400 rounded-xl flex items-center justify-center border border-neutral-850 shadow-xs shadow-teal-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-neutral-900 text-base">Absolute Identity Shield</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed font-sans">
                    All student vectors are pooled anonymously, decoupled from credentials, ensuring completely genuine evaluations.
                  </p>
                </div>
              </div>

              <div className="ambient-card p-8 rounded-3xl space-y-4 md:col-span-2 lg:col-span-1">
                <div className="w-10 h-10 bg-neutral-950 text-teal-400 rounded-xl flex items-center justify-center border border-neutral-850 shadow-xs shadow-teal-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-neutral-900 text-base">Native Postgres Sync</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed font-sans">
                    Review and export optimized PostgreSQL integration schema layouts and triggers seamlessly to your server stack.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Listing for Ease of Access */}
            <div className="space-y-4 pt-10 border-t border-neutral-150">
              <div className="text-left space-y-1">
                <h3 className="text-lg font-bold text-neutral-905">Training Modules Control Console</h3>
                <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase">AVAILABLE ACTIVE ASSESSMENTS</p>
              </div>
              <CampaignList campaigns={campaigns} onSelect={(id) => navigate(`/admin/${id}`)} />
            </div>
          </div>
        )}

        {/* VIEW 2: ADMIN PRIMARY PANEL (Campaign Generator & Lists) */}
        {currentPath === "/admin" && (
          !isAdminAuthenticated ? (
            <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} />
          ) : (
            <div className="space-y-8">
              <div className="text-left border-b border-neutral-150 pb-5">
                <h1 className="text-2xl font-black text-neutral-950 tracking-tight leading-none mb-2">
                  Administrative Suite
                </h1>
                <p className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-teal-600" />
                  <span>SIMPLESPHERE CONTROL CONSOLE</span>
                </p>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Creator Box */}
                <div className="lg:col-span-5 h-full">
                  <CampaignCreator onCreated={(id) => navigate(`/admin/${id}`)} />
                </div>

                {/* Lists and Database Info */}
                <div className="lg:col-span-7 space-y-8">
                  <CampaignList campaigns={campaigns} onSelect={(id) => navigate(`/admin/${id}`)} />
                </div>

              </div>
            </div>
          )
        )}

        {/* VIEW 3: ADMIN REPORT DASHBOARD */}
        {isAdminReportRoute && adminReportId && (
          !isAdminAuthenticated ? (
            <AdminLogin onLogin={() => setIsAdminAuthenticated(true)} />
          ) : (
            <CampaignReport id={adminReportId} onBack={() => navigate("/admin")} />
          )
        )}

        {/* VIEW 4: ANONYMOUS STUDENT RATING SURVEY */}
        {isStudentRoute && studentFormId && (
          <div className="w-full flex justify-center items-center py-4">
            {loadingStudentForm ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-8 h-8 border-2 border-neutral-300 border-t-teal-600 rounded-full animate-spin"></div>
                <p className="text-neutral-500 font-mono text-[9px] tracking-widest uppercase font-bold">ESTABLISHING TUNNEL PORTALS...</p>
              </div>
            ) : studentError ? (
              <div className="ambient-card p-10 rounded-3xl text-center max-w-sm mx-auto space-y-5">
                <p className="text-red-500 font-bold text-xs font-mono uppercase">{studentError}</p>
                <button
                  onClick={() => navigate("/")}
                  className="py-2.5 px-5 bg-neutral-900 hover:bg-black text-white text-[10px] font-bold font-mono tracking-wider uppercase rounded-xl cursor-pointer"
                >
                  Return to Base
                </button>
              </div>
            ) : activeStudentCampaign ? (
              <FeedbackForm campaign={activeStudentCampaign} onSubmit={handleStudentSubmit} />
            ) : null}
          </div>
        )}

      </main>

      {/* Universal Branded Footer - Hidden completely in student portal view to reduce clutter */}
      {!isStudentRoute && (
        <footer className="border-t border-neutral-200 bg-white py-8 mt-16 text-center text-xs font-mono text-neutral-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p>© 2026 simplesphere feedback engine. All student responses 100% anonymized.</p>
            <div className="flex gap-4">
              <span className="cursor-help flex items-center gap-1 hover:text-neutral-600 transition duration-150">
                <Vote className="w-3.5 h-3.5 text-neutral-300" />
                <span>Anon Vote Protocol</span>
              </span>
              <span>•</span>
              <span className="cursor-help flex items-center gap-1 hover:text-neutral-600 transition duration-150">
                <Compass className="w-3.5 h-3.5 text-neutral-300" />
                <span>Admin Center</span>
              </span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
