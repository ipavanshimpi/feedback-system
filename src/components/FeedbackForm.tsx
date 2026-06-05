import React, { useState } from "react";
import { Star, MessageSquareCode, CheckCircle, ArrowRight, Shield } from "lucide-react";
import { motion } from "motion/react";
import { Campaign, FeedbackResponse } from "../types";

interface FeedbackFormProps {
  campaign: Campaign;
  onSubmit: (ratings: Record<string, number>, comment: string) => Promise<FeedbackResponse | null>;
}

export function FeedbackForm({ campaign, onSubmit }: FeedbackFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingSelect = (qIdx: number, rating: number) => {
    setRatings((prev) => ({
      ...prev,
      [qIdx.toString()]: rating,
    }));
  };

  const handleStarHover = (qIdx: number, rating: number) => {
    setHoveredIndex((prev) => ({
      ...prev,
      [qIdx.toString()]: rating,
    }));
  };

  const handleStarLeave = (qIdx: number) => {
    setHoveredIndex((prev) => {
      const copy = { ...prev };
      delete copy[qIdx.toString()];
      return copy;
    });
  };

  // Check if student has rated all questions
  const isFormValid = campaign.form_schema.every((_, idx) => typeof ratings[idx.toString()] === "number");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Please provide a rating for all questions before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await onSubmit(ratings, comment);
      if (response) {
        setSubmitted(true);
      } else {
        setError("Failed to record your feedback. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4">
        <div className="ambient-card rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            className="w-14 h-14 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-6 border border-teal-100"
          >
            <CheckCircle className="w-8 h-8 stroke-[2]" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight leading-tight mb-3">
            Evaluation Received
          </h2>
          <p className="text-neutral-500 max-w-sm mb-6 text-xs leading-relaxed">
            Your metrics have been safely stored in the course dataset. All inputs are completely decoupled from your identity. Thank you for supporting tech training excellence.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-50 border border-neutral-200 text-neutral-400 text-[10px] font-mono">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>STORED & ANON</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-10 text-center sm:text-left space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-50 border border-neutral-200 text-neutral-600 font-mono">
          <span className="w-2 h-2 bg-teal-600 rounded-full animate-pulse"></span>
          ANONYMOUS RESPONDENT PORTAL
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tight leading-tight break-words">
          {campaign.title}
        </h1>
        <p className="text-neutral-500 text-sm sm:text-base leading-relaxed">
          Provide anonymous metrics to assist program coordinators in maintaining rigorous standards. All answers are pooled dynamically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          {campaign.form_schema.map((question, qIdx) => {
            const currentRating = ratings[qIdx.toString()] || 0;
            const currentHover = hoveredIndex[qIdx.toString()] || 0;

            return (
              <motion.div
                key={qIdx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: qIdx * 0.06 }}
                className="ambient-card p-6 sm:p-8 rounded-2xl relative overflow-hidden"
              >
                {/* Accent mini block on top edge when answered */}
                {currentRating > 0 && (
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-teal-600" />
                )}

                <div className="flex items-start justify-between gap-4 mb-5">
                  <span className="text-xs sm:text-sm font-bold text-neutral-400 font-mono tracking-widest block pt-0.5">
                    METRIC {(qIdx + 1).toString().padStart(2, '0')}
                  </span>
                </div>

                <p className="font-extrabold text-neutral-900 text-base sm:text-lg leading-snug mb-6">
                  {question}
                </p>

                <div className="flex items-center justify-center gap-3 py-4">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isLit = starValue <= (currentHover || currentRating);
                    const isSelected = starValue <= currentRating;

                    return (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => handleRatingSelect(qIdx, starValue)}
                        onMouseEnter={() => handleStarHover(qIdx, starValue)}
                        onMouseLeave={() => handleStarLeave(qIdx)}
                        className="p-1 focus:outline-none relative group transform transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer"
                        title={`${starValue} Stars`}
                      >
                        <Star
                          className={`w-10 h-10 transition-all duration-150 stroke-[1.25] ${
                            isLit
                              ? "fill-teal-555 stroke-teal-650 text-teal-600 filter drop-shadow-[0_0_8px_rgba(30,80,255,0.3)]"
                              : "fill-transparent stroke-neutral-250 text-neutral-250 hover:stroke-neutral-350"
                          }`}
                        />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-neutral-900 text-white text-xs py-1 px-2.5 rounded font-mono font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-md z-10">
                          {starValue === 1 && "POOR"}
                          {starValue === 2 && "FAIR"}
                          {starValue === 3 && "GOOD"}
                          {starValue === 4 && "VERY GOOD"}
                          {starValue === 5 && "EXCELLENT"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between text-xs font-semibold text-neutral-500 font-mono px-2 mt-2">
                  <span>Standard / Needs Work</span>
                  <span>Exceptional</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Text suggestion Area */}
        <div className="ambient-card p-6 sm:p-8 rounded-2xl space-y-4">
          <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-neutral-500 font-mono uppercase tracking-wider">
            <MessageSquareCode className="w-5 h-5 text-neutral-500" />
            <span>Detailed Constructive Commentary</span>
            <span className="text-xs font-normal text-neutral-400 select-none">(Optional)</span>
          </label>
          
          <p className="text-sm text-neutral-500 leading-relaxed">
            Provide actionable insights on laboratory modules, compiler pacing, custom library integrations, or any instructional components you recommend refining.
          </p>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            maxLength={1005}
            placeholder="Provide transparent reviews, framework assessments or team details here..."
            className="w-full text-sm sm:text-base font-medium border border-neutral-200 hover:border-neutral-300 p-4 rounded-xl font-sans bg-neutral-50 focus:bg-white resize-none input-focus-ring"
          />
          
          <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
            <span>Minimum 100% Identity Shield</span>
            <span>{comment.length} / 1000 MAX</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-650 font-medium font-mono text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid || submitting}
          className={`w-full py-4.5 px-6 rounded-xl font-bold text-sm tracking-wider uppercase font-mono flex items-center justify-center gap-2 shadow-sm focus:outline-none transition-all duration-155 cursor-pointer ${
            isFormValid && !submitting
              ? "bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.99] hover:shadow-md"
              : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin"></span>
              <span>Submitting Ratings...</span>
            </div>
          ) : (
            <>
              <span>Transmit Anon Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

