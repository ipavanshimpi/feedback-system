import React, { useState } from "react";
import { Sparkles, ArrowRight, BookOpen, AlertCircle, Cpu } from "lucide-react";

interface CampaignCreatorProps {
  onCreated: (id: string) => void;
}

export function CampaignCreator({ onCreated }: CampaignCreatorProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    { title: "IoT Batch Course Feedback", text: "Create a feedback form for the recent IoT and Fullstack Development batch covering MQTT and Next.js" },
    { title: "UI/UX Advanced Workshop", text: "Create feedback questions for the advanced Figma and Design Systems workshop program" },
    { title: "Fullstack Node & Database Team", text: "Create feedback questions targeting our PostgreSQL and Express server performance batch" }
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() === "") {
      setError("Please write a topic description.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Form generation failed");
      }

      onCreated(data.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred with Gemini form generation. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="ambient-card p-6 sm:p-8 rounded-3xl space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center text-white border border-neutral-850 shadow-sm shadow-emerald-900/10">
          <Cpu className="w-5.5 h-5.5 text-teal-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-none mb-1">
            Generate Program Forms
          </h2>
          <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase">
            LARGE LANGUAGE SYNTHESIS
          </p>
        </div>
      </div>

      <p className="text-sm text-neutral-500 leading-relaxed">
        Describe your evaluation topic or target batch. simplesphere's Course Evaluation Co-Pilot will automatically compile your specified training dimensions, requested question counts, and criteria into highly quantitative rating metrics.
      </p>

      <form onSubmit={handleCreate} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 tracking-wider uppercase font-mono block">
            AI Program Parameters
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
            rows={3}
            placeholder="e.g., IoT Batch Feedback form. Mention focus areas to fine-tune AI generations..."
            className="w-full text-sm font-mono border border-neutral-200 hover:border-neutral-350 focus:border-teal-600 focus:outline-none p-4 rounded-xl bg-neutral-50 focus:bg-white resize-none transition-all placeholder-neutral-400 leading-relaxed input-focus-ring"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={generating || prompt.trim() === ""}
          className={`w-full py-3.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-2 transform active:scale-[0.99] focus:outline-none transition-all duration-155 cursor-pointer ${
            generating || prompt.trim() === ""
              ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
              : "bg-neutral-900 hover:bg-neutral-950 text-white shadow-xs hover:shadow-md hover:shadow-neutral-950/10"
          }`}
        >
          {generating ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin"></span>
              <span>OPTIMIZING PROMPT...</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Compile with Gemini</span>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
            </>
          )}
        </button>
      </form>

      {/* Suggested Samples */}
      <div className="border-t border-neutral-100 pt-5">
        <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase font-mono block mb-3">
          INSTANT TRAINING TEMPLATES
        </span>
        <div className="space-y-2">
          {samplePrompts.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(sample.text)}
              disabled={generating}
              className="w-full text-left p-3 rounded-xl border border-neutral-100 hover:border-teal-600/30 hover:bg-teal-50/10 transition-all text-sm flex items-start gap-2.5 group cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-neutral-400 mt-0.5 group-hover:text-teal-600 transition-colors" />
              <div className="flex-1">
                <span className="font-bold text-neutral-800 block mb-0.5 group-hover:text-neutral-950 text-xs leading-tight">
                  {sample.title}
                </span>
                <span className="text-neutral-400 text-xs line-clamp-1 font-mono">
                  {sample.text}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
