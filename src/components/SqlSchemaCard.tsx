import React, { useState } from "react";
import { Check, Copy, Database, ShieldCheck, Terminal } from "lucide-react";

export function SqlSchemaCard() {
  const [copied, setCopied] = useState(false);

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
alter table responses enable row level security;

-- 4. Enable Public Campaign Select/Read
create policy "Allow public selective reads of campaigns"
on campaigns for select
using (true);

-- 5. Enable Anonymous Submissions (Insert Only on Responses)
create policy "Allow anonymous inserts to responses"
on responses for insert
with check (true);

-- 6. Enable Admin Reads of Responses (Select Only)
create policy "Allow public read of responses for admin dashboard"
on responses for select
using (true);
`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="ambient-card rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-100 bg-neutral-25 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-neutral-800" />
          <div>
            <h3 className="font-bold text-neutral-900 text-base">
              SQL Integration Blueprint
            </h3>
            <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase">
              POSTGRESQL RELATIONAL SCHEMA
            </p>
          </div>
        </div>
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl border border-neutral-200 hover:border-teal-600/30 text-xs font-semibold text-neutral-800 bg-white transition hover:bg-neutral-50 active:scale-[0.98] cursor-pointer font-mono"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-teal-700">COPIED SCRIPT</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-neutral-450" />
              <span>COPY SQL SCRIPT</span>
            </>
          )}
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-4 p-4 rounded-2xl border border-neutral-100 bg-neutral-25/55">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-neutral-905 leading-tight uppercase font-mono">
                Hardened RLS Policies
              </h4>
              <p className="text-xs text-neutral-550 leading-relaxed font-sans">
                Anonymous student feedback submissions bypass any login. The RLS policies permit global reads of campaigns and insert-only rights for responses.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-neutral-100 bg-neutral-25/55">
            <Terminal className="w-5 h-5 text-slate-605 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-neutral-905 leading-tight uppercase font-mono">
                Supabase SQL Deploy
              </h4>
              <p className="text-xs text-neutral-550 leading-relaxed font-sans">
                Copy and run this PostgreSQL layout directly inside your SQL editor to enable native triggers, unique ID indexes, and structured JSON structures.
              </p>
            </div>
          </div>
        </div>

        {/* Code area */}
        <div className="relative group">
          <pre className="text-xs font-mono text-neutral-400 bg-neutral-950 border border-neutral-900 p-5 rounded-2xl overflow-x-auto max-h-[290px] leading-relaxed select-all [color-scheme:dark]">
            <code>{sqlCode}</code>
          </pre>
          <div className="absolute top-4 right-4 text-xs font-mono bg-neutral-900 border border-neutral-800 text-neutral-500 px-2.5 py-1 rounded-lg backdrop-blur-xs select-none uppercase tracking-widest font-semibold">
            Postgres
          </div>
        </div>
      </div>
    </div>
  );
}
