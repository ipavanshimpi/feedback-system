import React from "react";
import { Calendar, ChevronRight, BarChart3, Database } from "lucide-react";
import { Campaign } from "../types";

interface CampaignListProps {
  campaigns: Campaign[];
  onSelect: (id: string) => void;
}

export function CampaignList({ campaigns, onSelect }: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="ambient-card rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
        <Database className="w-8 h-8 text-neutral-300 stroke-[1.25] mb-3.5" />
        <h4 className="font-bold text-neutral-900 text-base mb-1.5">
          No Evaluation Programs Active
        </h4>
        <p className="text-neutral-450 text-sm max-w-sm leading-relaxed">
          Provide a course topic prompt in the system panel to launch your first structured anonymous feedback form instantly.
        </p>
      </div>
    );
  }

  return (
    <div className="ambient-card rounded-3xl overflow-hidden">
      <div className="border-b border-neutral-100 bg-neutral-25 px-6 py-5 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-neutral-900 text-base">
            Active Feedback Programs
          </h3>
          <p className="text-xs text-neutral-400 font-mono tracking-widest mt-0.5 uppercase">
            STRUCTURED REVIEWS ({campaigns.length})
          </p>
        </div>
      </div>

      <div className="divide-y divide-neutral-100 max-h-[460px] overflow-y-auto">
        {campaigns.map((camp) => {
          const dateStr = new Date(camp.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          return (
            <button
              key={camp.id}
              onClick={() => onSelect(camp.id)}
              className="w-full text-left p-5 hover:bg-teal-50/5 flex items-center justify-between gap-4 transition-all duration-155 group cursor-pointer"
            >
              <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-neutral-800 text-base truncate leading-none group-hover:text-black">
                    {camp.title}
                  </h4>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-neutral-300" />
                    <span>{dateStr}</span>
                  </span>
                  <span className="flex items-center gap-1 bg-teal-50 text-xs px-2 py-0.5 rounded-full text-teal-700 font-semibold border border-teal-100/55 uppercase font-mono">
                    {camp.form_schema.length} metrics
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-neutral-400 font-mono font-medium opacity-0 group-hover:opacity-100 group-hover:text-teal-650 transition-all duration-155 flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>ENGAGE</span>
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-teal-650 transition duration-155 transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
