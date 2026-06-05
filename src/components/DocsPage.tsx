import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  LineChart,
  FileDown,
  Database,
  QrCode,
  Terminal,
  ArrowRight,
  Layers,
  Settings,
  Key,
  ShieldAlert,
  ArrowUpRight,
  Check,
  Copy
} from "lucide-react";

interface DocsPageProps {
  onNavigate: (path: string) => void;
}

export function DocsPage({ onNavigate }: DocsPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "features" | "database" | "setup">("overview");
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlCode = `-- Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 1. Create Campaigns Table
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  form_schema jsonb not null,
  created_at timestamp with time zone default now()
);

-- 2. Create Anonymous Responses Table
create table responses (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references campaigns(id) on delete cascade,
  ratings jsonb not null,
  suggestion_text text,
  created_at timestamp with time zone default now()
);

-- 3. Enable Row Level Security (RLS)
alter table campaigns enable row level security;
alter table responses enable row level security;`;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlCode);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Welcome Title Banner */}
      <div className="text-left border-b border-neutral-150 pb-5">
        <h1 className="text-3xl font-black text-neutral-950 tracking-tight leading-none mb-2">
          System Documentation
        </h1>
        <p className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>simplesphere Engine Features & Setup Manual</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="ambient-card rounded-2xl p-4 space-y-1">
            <span className="text-[9px] font-bold text-neutral-400 font-mono uppercase tracking-wider block px-3 mb-2">
              Sections Index
            </span>
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                activeTab === "overview"
                  ? "bg-primary text-white shadow-sm shadow-primary/15"
                  : "bg-white text-neutral-600 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab("features")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                activeTab === "features"
                  ? "bg-primary text-white shadow-sm shadow-primary/15"
                  : "bg-white text-neutral-600 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Features Guide</span>
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                activeTab === "database"
                  ? "bg-primary text-white shadow-sm shadow-primary/15"
                  : "bg-white text-neutral-600 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Database & SQL</span>
            </button>
            <button
              onClick={() => setActiveTab("setup")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                activeTab === "setup"
                  ? "bg-primary text-white shadow-sm shadow-primary/15"
                  : "bg-white text-neutral-600 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Setup & API Keys</span>
            </button>
          </div>

          <div className="ambient-card rounded-2xl p-5 space-y-3">
            <h4 className="text-[10px] font-bold text-neutral-400 font-mono uppercase tracking-widest leading-none">
              Quick Navigation
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate("/admin")}
                className="w-full py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-950 text-white text-[10px] font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Launch Admin Suite</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate("/")}
                className="w-full py-2 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-[10px] font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Go to Homepage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Viewer (lg:col-span-9) */}
        <div className="lg:col-span-9 ambient-card rounded-3xl p-6 sm:p-10 bg-white min-h-[500px]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold bg-primary/5 text-primary border border-primary/15 font-mono">
                  PLATFORM CORE SYSTEM
                </div>
                <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                  Overview & Value Proposition
                </h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  <strong>simplesphere</strong> is a full-stack evaluation engine engineered to optimize training feedback mechanisms. Built on clean modern React paradigms and powered by Google Gemini, the platform automates form generation while shielding student identities with absolute isolation.
                </p>
              </div>

              {/* Bento Grid Features Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 border border-neutral-100 rounded-2xl bg-neutral-25/40 space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-neutral-900 text-sm">AI Form Synthesis</h3>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Provide any course title or learning description. Gemini instantly generates a curated questionnaire of quantitative rating metrics.
                  </p>
                </div>

                <div className="p-5 border border-neutral-100 rounded-2xl bg-neutral-25/40 space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-650 flex items-center justify-center border border-teal-100">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-neutral-900 text-sm">Identity Shielding</h3>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Evaluations are completely decoupled from student accounts or credentials, ensuring 100% genuine feedback submissions.
                  </p>
                </div>

                <div className="p-5 border border-neutral-100 rounded-2xl bg-neutral-25/40 space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-neutral-900 text-sm">Interactive Analytics</h3>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Track scores in real time with Recharts bar and distribution charts, showing average trends and density indexes.
                  </p>
                </div>

                <div className="p-5 border border-neutral-100 rounded-2xl bg-neutral-25/40 space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-neutral-900 text-sm">Dual-Export Engine</h3>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Generate production-ready PDF reports on-demand using either html2canvas or high-fidelity vector script coordinate drawings.
                  </p>
                </div>
              </div>

              {/* Core Architecture */}
              <div className="border-t border-neutral-100 pt-6 space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 font-mono uppercase tracking-wider">
                  Technical Architecture Stack
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 border border-neutral-150 rounded-xl bg-neutral-50">
                    <span className="text-[10px] font-bold text-neutral-400 font-mono block mb-1">FRONTEND</span>
                    <span className="text-xs font-semibold text-neutral-800">React + TS + Vite</span>
                  </div>
                  <div className="p-3 border border-neutral-150 rounded-xl bg-neutral-50">
                    <span className="text-[10px] font-bold text-neutral-400 font-mono block mb-1">BACKEND</span>
                    <span className="text-xs font-semibold text-neutral-800">Express + tsx</span>
                  </div>
                  <div className="p-3 border border-neutral-150 rounded-xl bg-neutral-50">
                    <span className="text-[10px] font-bold text-neutral-400 font-mono block mb-1">STYLING</span>
                    <span className="text-xs font-semibold text-neutral-800">Tailwind CSS v4</span>
                  </div>
                  <div className="p-3 border border-neutral-150 rounded-xl bg-neutral-50">
                    <span className="text-[10px] font-bold text-neutral-400 font-mono block mb-1">DATABASE</span>
                    <span className="text-xs font-semibold text-neutral-800">JSON DB / Postgres</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURES GUIDE */}
          {activeTab === "features" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold bg-primary/5 text-primary border border-primary/15 font-mono">
                  FUNCTIONAL SPECIFICATION
                </div>
                <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                  Features Deep Dive
                </h2>
                <p className="text-neutral-500 text-sm">
                  Review the implementation Details of the system features. Click on headers to explore their functionality.
                </p>
              </div>

              {/* Detail list of features */}
              <div className="space-y-6">
                {/* 1. AI Campaign Creator */}
                <div className="p-6 border border-neutral-150 rounded-2xl hover:border-primary/20 transition-all duration-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/5 text-primary rounded-xl">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">
                      AI Campaign Creator (Gemini Copilot)
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Our form generator leverages the <code>@google/genai</code> SDK with the <code>gemini-3.5-flash</code> model. It takes user prompts and outputs a structured JSON response schema matching the requested parameters.
                  </p>
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-neutral-500 leading-normal">
                      <strong>AI Resiliency Fallback:</strong> If no API key is specified, the system triggers a localized rule-based engine mapping topics (e.g. course, product, event) to target feedback schema indexes.
                    </div>
                  </div>
                </div>

                {/* 2. Student Ingress Portal */}
                <div className="p-6 border border-neutral-150 rounded-2xl hover:border-primary/20 transition-all duration-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 text-teal-655 rounded-xl">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">
                      Anonymous Feedback Portal
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Accessible via clean routing endpoints <code>/f/:id</code>. It provides a simple, clean UI with large numeric sliders or buttons (1 to 5 Stars) and an optional suggestion text area. Feedback is verified, packaged, and pooled completely detached from student metadata.
                  </p>
                </div>

                {/* 3. Recharts Analytics */}
                <div className="p-6 border border-neutral-150 rounded-2xl hover:border-primary/20 transition-all duration-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <LineChart className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">
                      Real-Time Recharts Visualizations
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    The Admin Dashboard processes submissions in real time, rendering:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-neutral-500 pl-2 space-y-1">
                    <li><strong>Rating Indexes:</strong> Interactive bar charts mapping metric averages.</li>
                    <li><strong>Density Accumulator:</strong> Interactive pie charts indicating score weight distributions.</li>
                    <li><strong>Written Commentary Logs:</strong> Encrypted records listing qualitative recommendations.</li>
                  </ul>
                </div>

                {/* 4. Dual-Export PDF Engine */}
                <div className="p-6 border border-neutral-150 rounded-2xl hover:border-primary/20 transition-all duration-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-650 rounded-xl">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">
                      Hybrid PDF Export Pipeline
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Users can export full executive dashboards to print-ready PDF files. The download utility is built on a two-tier compiler hierarchy:
                  </p>
                  <ul className="list-decimal list-inside text-[11px] text-neutral-500 pl-2 space-y-1.5 font-sans">
                    <li><strong>Image Rendering:</strong> Captures the dashboard view using <code>html2canvas</code> and packages it in an image container inside <code>jsPDF</code>.</li>
                    <li><strong>Direct Vector Fallback:</strong> If canvas captures fail or are blocked, the engine runs a fallback script using `jsPDF` drawing coordinates manually.</li>
                  </ul>
                </div>

                {/* 5. Ingress Portal Sharing */}
                <div className="p-6 border border-neutral-150 rounded-2xl hover:border-primary/20 transition-all duration-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 text-rose-650 rounded-xl">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base">
                      QR Code & Ingress Sharing
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-550 leading-relaxed">
                    Instantly generates high-quality SVGs via <code>qrcode.react</code> containing the URL.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATABASE & SQL */}
          {activeTab === "database" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold bg-primary/5 text-primary border border-primary/15 font-mono">
                  PERSISTENCE SCHEMA
                </div>
                <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                  Database Schema & Integrations
                </h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  By default, simplesphere runs on a local JSON database schema stored under <code>data/db.json</code>.
                </p>
              </div>

              {/* SQL script preview panel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <span className="text-xs font-bold text-neutral-800 font-mono">Postgres Relational Table Setup</span>
                  <button
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg border border-neutral-200 text-[10px] font-bold font-mono text-neutral-850 hover:bg-neutral-50 active:scale-[0.98] cursor-pointer bg-white"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3 h-3 text-teal-600" />
                        <span className="text-teal-700">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-450" />
                        <span>COPY SCRIPT</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="text-[11px] font-mono text-neutral-400 bg-neutral-950 p-4.5 rounded-2xl overflow-x-auto max-h-[220px] leading-relaxed [color-scheme:dark]">
                    <code>{sqlCode}</code>
                  </pre>
                  <span className="absolute bottom-3 right-3 text-[9px] font-mono text-neutral-500 uppercase tracking-wider block">
                    Postgres Blueprint
                  </span>
                </div>
              </div>

              {/* RLS Explanation */}
              <div className="p-5 border border-amber-100 bg-amber-50/15 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <h4 className="font-bold text-xs uppercase font-mono leading-none">
                    Security & Row-Level Policies
                  </h4>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  The anonymous feedback setup relies on Row-Level Security.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SETUP & API KEYS */}
          {activeTab === "setup" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-bold bg-primary/5 text-primary border border-primary/15 font-mono">
                  CONFIG & INSTALLATION
                </div>
                <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
                  Local Setup & Environments
                </h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Configure variables locally and run the application stack on host endpoints. Follow the steps below:
                </p>
              </div>

              {/* Environment Variable Table */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-900 font-mono uppercase tracking-wider">
                  Environment Schema File (<code>.env.local</code>)
                </h3>
                <div className="border border-neutral-150 rounded-xl overflow-hidden text-xs">
                  <div className="bg-neutral-50 p-3 grid grid-cols-12 font-mono font-bold text-neutral-600 border-b border-neutral-150">
                    <div className="col-span-4">KEY</div>
                    <div className="col-span-8">DESCRIPTION / VALUE</div>
                  </div>
                  <div className="divide-y divide-neutral-150 font-mono text-[11px] text-neutral-500">
                    <div className="p-3.5 grid grid-cols-12">
                      <div className="col-span-4 font-bold text-neutral-800 truncate">PORT</div>
                      <div className="col-span-8">Server local port index. Default is <code>3001</code>.</div>
                    </div>
                    <div className="p-3.5 grid grid-cols-12 items-center">
                      <div className="col-span-4 font-bold text-neutral-850 truncate flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-teal-650 shrink-0" />
                        <span>GEMINI_API_KEY</span>
                      </div>
                      <div className="col-span-8 leading-normal">
                        Your Google AI Studio API Key. If blank, local fallbacks are generated.
                      </div>
                    </div>
                    <div className="p-3.5 grid grid-cols-12">
                      <div className="col-span-4 font-bold text-neutral-800 truncate">NODE_ENV</div>
                      <div className="col-span-8">Run state environment (e.g. <code>development</code>, <code>production</code>).</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Local launch commands */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-neutral-900 font-mono uppercase tracking-wider">
                  Terminal Commands Execution
                </h3>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="p-4 border border-neutral-150 bg-neutral-50 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-widest block font-mono">1. Dependencies Install</span>
                    <pre className="text-neutral-800 select-all">npm install</pre>
                  </div>
                  <div className="p-4 border border-neutral-150 bg-neutral-50 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-widest block font-mono">2. Start Development Environment</span>
                    <pre className="text-neutral-800 select-all">npm run dev</pre>
                  </div>
                  <div className="p-4 border border-neutral-150 bg-neutral-50 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-widest block font-mono">3. Build Production Bundle</span>
                    <pre className="text-neutral-800 select-all">npm run build</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
