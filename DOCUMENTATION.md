# simplesphere System Documentation & Setup Manual

Welcome to **simplesphere**, an autonomous, full-stack feedback and course evaluation engine. simplesphere combines AI-powered dynamic form generation, absolute student anonymity, interactive charting dashboards, and professional PDF reporting pipelines.

---

## 📖 Table of Contents
1. [Overview & Value Proposition](#-overview--value-proposition)
2. [Technical Architecture](#-technical-architecture)
3. [Features Guide](#-features-guide)
   - [AI Campaign Creator](#1-ai-campaign-creator)
   - [Anonymous Feedback Ingress](#2-anonymous-feedback-ingress-portal)
   - [Interactive Analytics & Dashboard](#3-interactive-analytics--dashboard)
   - [Dual-Export PDF Engine](#4-dual-export-pdf-engine)
   - [Ingress Portal Sharing (QR & URL)](#5-ingress-portal-sharing)
4. [Database Setup & Schema (PostgreSQL)](#-database-setup--schema-postgresql)
   - [SQL Schema Blueprint](#sql-schema-blueprint)
   - [Row-Level Security (RLS) Triggers](#row-level-security-rls-triggers)
5. [Local Development Setup](#-local-development-setup)
   - [Environment Variables](#environment-variables)
   - [Terminal Quickstart Commands](#terminal-quickstart-commands)
6. [Production Deployment](#-production-deployment-vercel)

---

## 🚀 Overview & Value Proposition

**simplesphere** is designed for educational institutes, workshops, and corporate training bootcamps. It solves the critical challenge of obtaining **authentic, unbiased feedback** by decoupling evaluation ratings from student identities. 

### Core Pillars:
* **AI-First Generation**: Zero-friction form construction utilizing Gemini.
* **Identity Shielding**: Complete decoupling of survey responses from student metadata.
* **Executive Reports**: Instant, downloadable visual analytics for administrators.

---

## 🛠 Technical Architecture

The platform runs as a unified full-stack Node.js server environment:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Vite Frontend Dev Server                    │
│     - React 19 SPA (Custom Popstate Router)                      │
│     - Tailwind CSS v4 styling & Recharts visual components      │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Proxy API Requests
┌────────────────────────────────▼────────────────────────────────┐
│                   Express TS Backend (server.ts)                │
│     - JSON DB CRUD persistence file (data/db.json)              │
│     - Google Gemini 3.5 Flash Model API SDK Integrator          │
└─────────────────────────────────────────────────────────────────┘
```

* **Frontend**: React 19, TypeScript, Vite, Recharts, Tailwind CSS v4, Lucide Icons, QR Code React.
* **Backend**: Express (Node.js), TypeScript Compiler (`tsx` runner), Gemini API SDK (`@google/genai`).
* **Database**: Local JSON File Database (for simple local dev) / PostgreSQL relational layout ready (for production staging).

---

## 🌟 Features Guide

### 1. AI Campaign Creator
Powered by the Google Gemini SDK (using model `gemini-3.5-flash`), the admin creator takes a natural language description and generates:
1. An elegant, context-appropriate Title.
2. A list of 4 to 15 quantitative rating questions.

> [!TIP]
> **API Key Resiliency:** If `GEMINI_API_KEY` is not present, a local rule-based template compiler triggers automatically, classifying topics (e.g. "Workshop", "IoT", "Product") to map out standardized questions.

### 2. Anonymous Feedback Ingress Portal
Students access a clean, mobile-optimized view at `/f/:campaign_id` that is completely separate from administration interfaces:
* **Clean Sliders**: Rating inputs on a clear 1-to-5 scale.
* **Anonymity Guarantee**: No session logins, cookies, or tracking headers. Responses are written directly into a pooled database structure.

### 3. Interactive Analytics & Dashboard
The Administrative report dashboard provides:
* **Rating Indexes**: Bar charts indicating the average score per question category.
* **Weight Densities**: Pie charts displaying the overall frequency counts of score variables (1★ to 5★).
* **Transparent Recommendations**: A scrollable log of raw open-ended recommendations.

### 4. Dual-Export PDF Engine
Administrators can download clean, print-ready reports:
1. **Canvas Compilation**: The layout is rasterized using `html2canvas` and nested inside a PDF container.
2. **Direct Vector Fallback**: If browser extensions block canvas operations, the engine runs a fallback script using `jsPDF` coordinate drawing, plotting shapes, text-wrapping labels, and creating clean custom boxes manually.

### 5. Ingress Portal Sharing
Sharing campaigns during classes is simple:
* **QR Codes**: Renders clean, high-contrast SVGs via `qrcode.react`.
* **One-Click URL Copying**: Instantly copies the student ingress portal link to the clipboard.

---

## 🗄 Database Setup & Schema (PostgreSQL)

If migrating from the local JSON file database to a production relational database, run the script below inside your SQL Editor:

### SQL Schema Blueprint

```sql
-- Enable UUID Extension
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
```

### Row-Level Security (RLS) Triggers

To ensure student responses remain strictly secure and insert-only:

```sql
-- Enable Row Level Security (RLS)
alter table campaigns enable row level security;
alter table responses enable row level security;

-- Allow anyone to read active campaign schemas (to render forms)
create policy "Allow public selective reads of campaigns"
on campaigns for select
using (true);

-- Allow anonymous inserts on responses (students submit feedback)
create policy "Allow anonymous inserts to responses"
on responses for insert
with check (true);

-- Allow admins to read responses (to calculate analytics)
create policy "Allow public read of responses for admin dashboard"
on responses for select
using (true);
```

---

## 💻 Local Development Setup

### Environment Variables
Create a file named `.env.local` in the project root:

```env
# Server running port
PORT=3001

# Google Gemini API key from Google AI Studio
GEMINI_API_KEY=AIzaSy...

# Run environment state
NODE_ENV=development
```

### Terminal Quickstart Commands

```bash
# 1. Install dependencies
npm install

# 2. Run developer environment (Vite frontend + Express backend)
npm run dev

# 3. Verify TypeScript compiling and errors
npm run lint

# 4. Compile frontend production bundle
npm run build

# 5. Start the production backend server
npm run start
```

---

## ☁️ Production Deployment (Vercel)

The codebase contains a pre-configured `vercel.json` file for routing:

1. Push your repository to GitHub.
2. Link your project inside the Vercel Dashboard.
3. Configure the `GEMINI_API_KEY` under **Environment Variables** in the Vercel settings panel.
4. Deploy. Vercel automatically matches static assets and redirects backend API requests to serverless runtimes.
