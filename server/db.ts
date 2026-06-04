import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Campaign, FeedbackResponse } from "../src/types";

const isVercel = process.env.VERCEL === "1";
const DB_PATH = isVercel
  ? path.join("/tmp", "db.json")
  : path.join(process.cwd(), "data", "db.json");

interface DatabaseSchema {
  campaigns: Campaign[];
  responses: FeedbackResponse[];
}

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initialDb: DatabaseSchema = {
      campaigns: [
        {
          id: "iot-fullstack-mock-id",
          title: "Sample: IoT & Fullstack July Group",
          form_schema: [
            "How would you rate the quality of IoT hardware lab hours?",
            "How clear were the explanations of Next.js App Router and APIs?",
            "Rate the design and debugging support during team project prototyping.",
            "How satisfied are you with the post-batch placement orientation?"
          ],
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      responses: [
        {
          id: "resp-1",
          campaign_id: "iot-fullstack-mock-id",
          ratings: { "0": 5, "1": 4, "2": 5, "3": 4 },
          suggestion_text: "Lab hours were amazing! I wish we covered some advanced ESP32 WebSockets integrations earlier.",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "resp-2",
          campaign_id: "iot-fullstack-mock-id",
          ratings: { "0": 4, "1": 5, "2": 4, "3": 5 },
          suggestion_text: "Perfect curriculum spacing. The instructor explained the differences between server and client components very clearly.",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "resp-3",
          campaign_id: "iot-fullstack-mock-id",
          ratings: { "0": 3, "1": 4, "2": 3, "3": 3 },
          suggestion_text: "A bit fast-paced on the database setup days, but overall very high quality material and support.",
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
  }
}

// Read database
export function readDb(): DatabaseSchema {
  ensureDbExists();
  try {
    const content = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to read JSON DB, returning empty schema", error);
    return { campaigns: [], responses: [] };
  }
}

// Write database
export function writeDb(data: DatabaseSchema) {
  ensureDbExists();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to JSON DB", error);
  }
}

// Campaign Operations
export function getCampaigns(): Campaign[] {
  const db = readDb();
  return db.campaigns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getCampaignById(id: string): Campaign | undefined {
  const db = readDb();
  return db.campaigns.find(c => c.id === id);
}

export function createCampaign(title: string, form_schema: string[]): Campaign {
  const db = readDb();
  const newCampaign: Campaign = {
    id: crypto.randomUUID(),
    title,
    form_schema,
    created_at: new Date().toISOString()
  };
  db.campaigns.push(newCampaign);
  writeDb(db);
  return newCampaign;
}

// Response Operations
export function getResponsesByCampaignId(campaignId: string): FeedbackResponse[] {
  const db = readDb();
  return db.responses.filter(r => r.campaign_id === campaignId);
}

export function createResponse(campaignId: string, ratings: Record<string, number>, suggestionText: string | null): FeedbackResponse {
  const db = readDb();
  const newResponse: FeedbackResponse = {
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    ratings,
    suggestion_text: suggestionText || null,
    created_at: new Date().toISOString()
  };
  db.responses.push(newResponse);
  writeDb(db);
  return newResponse;
}
