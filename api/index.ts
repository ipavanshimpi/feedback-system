import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Types
export interface Campaign {
  id: string;
  title: string;
  form_schema: string[];
  created_at: string;
}

export interface FeedbackResponse {
  id: string;
  campaign_id: string;
  ratings: Record<string, number>;
  suggestion_text: string | null;
  created_at: string;
}

export interface QuestionAverage {
  question: string;
  index: number;
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CampaignAnalytics {
  campaign: Campaign;
  totalResponses: number;
  averages: QuestionAverage[];
  suggestions: {
    id: string;
    text: string;
    created_at: string;
  }[];
}

// Load .env.local first if it exists, otherwise fall back to .env
const localEnvPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

// Database Setup
const isVercel = process.env.VERCEL === "1";
const DB_PATH = isVercel
  ? path.join("/tmp", "db.json")
  : path.join(process.cwd(), "data", "db.json");

interface DatabaseSchema {
  campaigns: Campaign[];
  responses: FeedbackResponse[];
}

let memoryDb: DatabaseSchema | null = null;

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_KEY);

async function supabaseRequest<T>(pathAndQuery: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function getCampaignsStore(): Promise<Campaign[]> {
  if (!hasSupabaseConfig) {
    return getCampaigns();
  }

  return supabaseRequest<Campaign[]>("campaigns?select=*&order=created_at.desc");
}

async function getCampaignByIdStore(id: string): Promise<Campaign | undefined> {
  if (!hasSupabaseConfig) {
    return getCampaignById(id);
  }

  const rows = await supabaseRequest<Campaign[]>(`campaigns?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] || getCampaignById(id);
}

async function createCampaignStore(title: string, form_schema: string[]): Promise<Campaign> {
  if (!hasSupabaseConfig) {
    return createCampaign(title, form_schema);
  }

  const rows = await supabaseRequest<Campaign[]>("campaigns", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({ title, form_schema }),
  });

  if (!rows[0]) {
    throw new Error("Supabase did not return the created campaign.");
  }

  return rows[0];
}

async function updateCampaignStore(id: string, title: string, form_schema: string[]): Promise<Campaign | undefined> {
  if (!hasSupabaseConfig) {
    return updateCampaign(id, title, form_schema);
  }

  const rows = await supabaseRequest<Campaign[]>(`campaigns?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({ title, form_schema }),
  });

  return rows[0];
}

async function deleteCampaignStore(id: string): Promise<boolean> {
  if (!hasSupabaseConfig) {
    return deleteCampaign(id);
  }

  // Delete associated responses first
  await supabaseRequest(`responses?campaign_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  // Delete the campaign itself
  await supabaseRequest(`campaigns?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  return true;
}


async function getResponsesByCampaignIdStore(campaignId: string): Promise<FeedbackResponse[]> {
  if (!hasSupabaseConfig) {
    return getResponsesByCampaignId(campaignId);
  }

  return supabaseRequest<FeedbackResponse[]>(
    `responses?select=*&campaign_id=eq.${encodeURIComponent(campaignId)}&order=created_at.desc`
  );
}

async function ensureSupabaseCampaign(campaign: Campaign): Promise<void> {
  if (!hasSupabaseConfig) {
    return;
  }

  const existing = await supabaseRequest<Campaign[]>(
    `campaigns?select=id&id=eq.${encodeURIComponent(campaign.id)}&limit=1`
  );

  if (existing[0]) {
    return;
  }

  await supabaseRequest<Campaign[]>("campaigns", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: campaign.id,
      title: campaign.title,
      form_schema: campaign.form_schema,
      created_at: campaign.created_at,
    }),
  });
}

async function createResponseStore(campaign: Campaign, ratings: Record<string, number>, suggestionText: string | null): Promise<FeedbackResponse> {
  if (!hasSupabaseConfig) {
    return createResponse(campaign.id, ratings, suggestionText);
  }

  await ensureSupabaseCampaign(campaign);

  const rows = await supabaseRequest<FeedbackResponse[]>("responses", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      campaign_id: campaign.id,
      ratings,
      suggestion_text: suggestionText || null,
    }),
  });

  if (!rows[0]) {
    throw new Error("Supabase did not return the created feedback response.");
  }

  return rows[0];
}

function setupMemoryDbFallback() {
  if (!memoryDb) {
    memoryDb = {
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
  }
}

function ensureDbExists() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const seedPath = path.join(process.cwd(), "data", "db.json");
      if (fs.existsSync(seedPath)) {
        const seedData = fs.readFileSync(seedPath, "utf-8");
        fs.writeFileSync(DB_PATH, seedData, "utf-8");
      } else {
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
  } catch (err) {
    console.error("ensureDbExists failed, using memory DB fallback:", err);
    setupMemoryDbFallback();
  }
}

export function readDb(): DatabaseSchema {
  ensureDbExists();
  if (memoryDb) {
    return memoryDb;
  }
  try {
    const content = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to read JSON DB, returning memory/empty schema", error);
    setupMemoryDbFallback();
    return memoryDb!;
  }
}

export function writeDb(data: DatabaseSchema) {
  if (memoryDb) {
    memoryDb = data;
    return;
  }
  try {
    ensureDbExists();
    if (memoryDb) {
      memoryDb = data;
      return;
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to JSON DB, switching to memory DB:", error);
    memoryDb = data;
  }
}

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

export function updateCampaign(id: string, title: string, form_schema: string[]): Campaign | undefined {
  const db = readDb();
  const campaign = db.campaigns.find(c => c.id === id);
  if (!campaign) {
    return undefined;
  }

  campaign.title = title;
  campaign.form_schema = form_schema;
  writeDb(db);
  return campaign;
}

export function deleteCampaign(id: string): boolean {
  const db = readDb();
  const index = db.campaigns.findIndex(c => c.id === id);
  if (index === -1) {
    return false;
  }
  db.campaigns.splice(index, 1);
  db.responses = db.responses.filter(r => r.campaign_id !== id);
  writeDb(db);
  return true;
}


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

// Lazy initialize Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured in the Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

const app = express();
app.use(express.json());

// API - Get all campaigns
app.get("/api/campaigns", async (req, res) => {
  try {
    const list = await getCampaignsStore();
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to load campaigns list" });
  }
});

// API - Get single campaign
app.get("/api/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await getCampaignByIdStore(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to load campaign" });
  }
});

// Prompt builder helper function

export function buildGeminiPrompt(adminPrompt: string): string {
  // 1. Total questions count parsing
  let totalQuestionsCount = 0;
  const totalMatch = adminPrompt.match(/(\d+)\s*questions/i);
  if (totalMatch) {
    totalQuestionsCount = parseInt(totalMatch[1], 10);
  }

  // 2. Category counts parsing
  let facultyCount = 0;
  let infraCount = 0;
  let contentCount = 0;
  let placementCount = 0;

  const facultyMatch = adminPrompt.match(/(\d+)\s*on\s*(faculty|teaching)/i);
  if (facultyMatch) facultyCount = parseInt(facultyMatch[1], 10);

  const infraMatch = adminPrompt.match(/(\d+)\s*on\s*(infra|facility|facilities)/i);
  if (infraMatch) infraCount = parseInt(infraMatch[1], 10);

  const contentMatch = adminPrompt.match(/(\d+)\s*on\s*(course|content|curriculum)/i);
  if (contentMatch) contentCount = parseInt(contentMatch[1], 10);

  const placementMatch = adminPrompt.match(/(\d+)\s*on\s*(placement|career)/i);
  if (placementMatch) placementCount = parseInt(placementMatch[1], 10);

  // Extract topic/subject dynamically
  let extractedTopic = "";
  const iotMatch = adminPrompt.match(/iot/i);
  if (iotMatch) {
    extractedTopic = "IoT";
  } else {
    const quoteMatch = adminPrompt.match(/"([^"]+)"|'([^']+)'/);
    if (quoteMatch) {
      extractedTopic = quoteMatch[1] || quoteMatch[2];
    } else {
      const words = adminPrompt.split(/\s+/).filter(w => w.length > 2 && !/question|faculty|infra|content|placement/i.test(w));
      if (words.length > 0) {
        extractedTopic = words[0];
      }
    }
  }

  // Build the rules for category counts
  let categoryRules = "";
  if (facultyCount > 0 || infraCount > 0 || contentCount > 0 || placementCount > 0) {
    categoryRules = "Generate exactly:\n" +
      (facultyCount > 0 ? `- ${facultyCount} Faculty & Teaching Quality questions\n` : "") +
      (infraCount > 0 ? `- ${infraCount} Infrastructure & Facilities questions\n` : "") +
      (contentCount > 0 ? `- ${contentCount} Course Content & Curriculum questions\n` : "") +
      (placementCount > 0 ? `- ${placementCount} Placement & Career Support questions\n` : "") +
      "Count the questions before responding to ensure these category counts are met exactly.";
  } else {
    categoryRules = "Distribute questions proportionally across these 4 categories:\n" +
      "- Faculty & Teaching Quality\n" +
      "- Infrastructure & Facilities\n" +
      "- Course Content & Curriculum\n" +
      "- Placement & Career Support";
  }

  // Build count instruction
  let countInstruction = "";
  if (totalQuestionsCount > 0) {
    countInstruction = `You MUST generate exactly ${totalQuestionsCount} questions. No more, no less. Count them before responding.`;
  } else {
    countInstruction = "Generate between 4 and 15 questions in total.";
  }

  // Build topic specific rules
  let topicRules = "";
  if (extractedTopic.toLowerCase().includes("iot")) {
    topicRules = "Every question must mention IoT, embedded systems, sensors, or related topics to make them highly specific, not generic.";
  } else if (extractedTopic) {
    topicRules = `Every question must mention ${extractedTopic} or related concepts to make them highly specific to the subject matter.`;
  } else {
    topicRules = "Every question must be specific to the course topic or batch mentioned in the instructions.";
  }

  return `You are an automated feedback questionnaire generator.

[ADMIN INSTRUCTIONS]
The text below contains the admin's topic description and instructions.
Do NOT turn any part of the text below into a question.
-----
${adminPrompt}
-----

[STRICT GENERATION RULES]
1. Do NOT turn any part of the admin instructions above into a question. For example, if the instructions say "X questions on Y topic", do NOT create a question asking about X questions or Y topic.
2. ${countInstruction}
3. ${categoryRules}
4. ${topicRules}
5. All questions must be rateable on a 1 to 5 scale (e.g., asking how well or how satisfied they were with a specific aspect).
6. Return a valid JSON object ONLY. Do NOT wrap in markdown code blocks (no \`\`\`json or \`\`\`). No explanations, no text before, and no text after.

Expected Output JSON Format:
{
  "title": "A clean, precise title including the batch/course name (e.g. '${extractedTopic || "Course"} Feedback Form')",
  "questions": [
    "Question 1",
    "Question 2",
    "..."
  ]
}`;
}

// API - Create new campaign via Gemini prompt
app.post("/api/campaigns", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "Please enter a valid topic or prompt." });
  }

  try {
    let questions: string[] = [];
    let campaignTitle = prompt.trim();
    let hasExplicitTitle = false;

    // Extract title early so it can be used in local fallbacks
    const exactTitleMatch = prompt.match(/exact title:\s*["']([^"']+)["']/i);
    if (exactTitleMatch && exactTitleMatch[1]) {
      campaignTitle = exactTitleMatch[1];
      hasExplicitTitle = true;
    } else {
      const quoteMatch = prompt.match(/"([^"]{10,120})"/);
      if (quoteMatch && quoteMatch[1]) {
        campaignTitle = quoteMatch[1];
        hasExplicitTitle = true;
      }
    }

    if (!hasExplicitTitle) {
      const cleanPrompt = prompt.trim();
      if (
        cleanPrompt.length < 100 &&
        !cleanPrompt.includes("\n") &&
        !cleanPrompt.includes(".") &&
        !cleanPrompt.toLowerCase().startsWith("create ") &&
        !cleanPrompt.toLowerCase().startsWith("generate ")
      ) {
        campaignTitle = cleanPrompt;
      }

      // Explicitly clean instructions leakage from title if it was not explicitly quoted
      if (campaignTitle.includes(",")) {
        campaignTitle = campaignTitle.split(",")[0].trim();
      }
      if (campaignTitle.toLowerCase().includes("questions")) {
        const parts = campaignTitle.split(/\d+\s*questions/i);
        campaignTitle = parts[0].trim();
      }
      campaignTitle = campaignTitle.replace(/[\-\:\,\s]+$/, "").trim();
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasApiKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";

    let isGeminiSuccess = false;
    if (hasApiKey) {
      try {
        const ai = getGeminiClient();
        console.log(`Querying Gemini to generate feedback form for topic: "${prompt}"`);
        const contents = buildGeminiPrompt(prompt);

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction:
              "You are an API that generates course evaluation campaigns.\n" +
              "You must return a valid JSON object only. No markdown formatting, no code blocks (like \`\`\`json), no other text.\n" +
              "Output JSON Structure:\n" +
              "{\n" +
              "  \"title\": \"Campaign Title\",\n" +
              "  \"questions\": [\"Question 1\", \"Question 2\"]\n" +
              "}\n" +
              "Rules for questions:\n" +
              "- Must be generated STRICTLY based on the admin's prompt description.\n" +
              "- Do NOT use the admin's prompt description or instructions text itself as a question.\n" +
              "- Must be specific to the batch/course name mentioned (e.g. 'IoT Batch').\n" +
              "- Distributed proportionally across these 4 categories: Faculty & Teaching Quality, Infrastructure & Facilities, Course Content & Curriculum, and Placement & Career Support.\n" +
              "- If the prompt specifies a specific number of questions on a topic, follow that instruction EXACTLY.\n" +
              "- All questions must be rateable on a 1 to 5 scale.\n" +
              "- Minimum 4, maximum 15 questions.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "questions"]
            },
          },
        });

        let text = response.text?.trim() || "{}";
        // Strip markdown code fences (```json or ```) before JSON.parse()
        text = text.replace(/^```(json)?\s*/i, "").replace(/\s*```$/, "").trim();
        if (text.includes("```")) {
          const match = text.match(/```(?:json)?([\s\S]+?)```/);
          if (match && match[1]) {
            text = match[1].trim();
          }
        }

        let parsedData: { title?: string; questions?: string[] } = {};
        try {
          parsedData = JSON.parse(text);
        } catch (parseError) {
          console.error("Failed to parse Gemini output:", text, parseError);
        }

        campaignTitle = parsedData.title?.trim() || campaignTitle;
        questions = parsedData.questions || [];
        if (questions && questions.length > 0) {
          isGeminiSuccess = true;
        }
      } catch (geminiError: any) {
        console.error("Gemini Form Generation API call failed. Falling back to local template questions generator. Error details:", geminiError);
      }
    }

    if (!isGeminiSuccess) {
      if (hasApiKey) {
        console.log("Gemini API call failed or returned empty questions. Falling back to local template questions generator.");
      } else {
        console.log("No valid GEMINI_API_KEY configured. Falling back to local template questions generator.");
      }

      // Try to parse numbered questions/dimensions from the prompt (if any)
      const lines = prompt.split('\n');
      const numberedItems: string[] = [];
      for (const line of lines) {
        const match = line.trim().match(/^\d+[\.\)]\s*(.+)$/i);
        if (match && match[1]) {
          const content = match[1].trim();
          let question = content;
          if (!content.toLowerCase().startsWith("how") && !content.toLowerCase().startsWith("rate") && !content.toLowerCase().startsWith("would") && !content.toLowerCase().startsWith("clarity")) {
            question = `How would you rate the ${content.charAt(0).toLowerCase() + content.slice(1)}`;
          } else if (content.toLowerCase().startsWith("clarity")) {
            question = `How would you rate the clarity ${content.slice(7)}`;
          }
          if (!question.endsWith("?") && !question.endsWith(".")) {
            question += "?";
          }
          numberedItems.push(question);
        }
      }

      if (numberedItems.length >= 3) {
        questions = numberedItems;
      } else {
        // Parse topic and counts for custom fallback
        let totalQuestionsCount = 0;
        const totalMatch = prompt.match(/(\d+)\s*questions/i);
        if (totalMatch) totalQuestionsCount = parseInt(totalMatch[1], 10);

        let facultyCount = 0;
        let infraCount = 0;
        let contentCount = 0;
        let placementCount = 0;

        const facultyMatch = prompt.match(/(\d+)\s*on\s*(faculty|teaching)/i);
        if (facultyMatch) facultyCount = parseInt(facultyMatch[1], 10);

        const infraMatch = prompt.match(/(\d+)\s*on\s*(infra|facility|facilities)/i);
        if (infraMatch) infraCount = parseInt(infraMatch[1], 10);

        const contentMatch = prompt.match(/(\d+)\s*on\s*(course|content|curriculum)/i);
        if (contentMatch) contentCount = parseInt(contentMatch[1], 10);

        const placementMatch = prompt.match(/(\d+)\s*on\s*(placement|career)/i);
        if (placementMatch) placementCount = parseInt(placementMatch[1], 10);

        let extractedTopic = "";
        const iotMatch = prompt.match(/iot/i);
        if (iotMatch) {
          extractedTopic = "IoT";
        } else {
          const genericWords = [
            "program", "feedback", "form", "course", "evaluation", 
            "internship", "mid", "end", "term", "final", "semester", 
            "bootcamp", "batch", "2025", "2026", "summer", "winter", 
            "spring", "autumn", "workshop", "seminar"
          ];

          const getMeaningfulWords = (text: string): string[] => {
            return text
              .split(/[\s\-_]+/)
              .filter(Boolean)
              .map(w => w.replace(/[^a-zA-Z&]/g, "")) // keep & and letters
              .filter(w => w.length > 0 && !genericWords.includes(w.toLowerCase()));
          };

          // 1. Check if there is a dash "—" or "-" and extract meaningful words after it
          const dashIndex = campaignTitle.indexOf("—") !== -1 ? campaignTitle.indexOf("—") : campaignTitle.indexOf("-");
          let foundAfterDash = false;
          if (dashIndex !== -1) {
            const afterDash = campaignTitle.slice(dashIndex + 1).trim();
            const meaningfulAfter = getMeaningfulWords(afterDash);
            if (meaningfulAfter.length > 0) {
              extractedTopic = meaningfulAfter.slice(0, 3).join(" ");
              foundAfterDash = true;
            }
          }

          if (!foundAfterDash) {
            // 2. If no dash or no meaningful words after it, parse before markers
            let base = campaignTitle;
            const dashMatch = base.match(/—|-/);
            if (dashMatch && dashMatch.index !== undefined) {
              base = base.slice(0, dashMatch.index).trim();
            }

            const boundaryRegex = /(?:bootcamp|batch|2025|2026)/i;
            const boundaryMatch = base.match(boundaryRegex);
            if (boundaryMatch && boundaryMatch.index !== undefined) {
              base = base.slice(0, boundaryMatch.index).trim();
            }

            // Capitalize known long terms
            base = base.replace(/artificial\s+intelligence/i, "AI");
            base = base.replace(/advanced\s+/i, ""); // Remove "Advanced"

            const meaningfulBefore = getMeaningfulWords(base);
            if (meaningfulBefore.length > 0) {
              if (meaningfulBefore[1] === "&" || meaningfulBefore[1].toLowerCase() === "and") {
                if (meaningfulBefore[2] && meaningfulBefore[2].toLowerCase() === "machine" && meaningfulBefore[3] && meaningfulBefore[3].toLowerCase() === "learning") {
                  extractedTopic = meaningfulBefore.slice(0, 4).join(" ");
                } else {
                  extractedTopic = meaningfulBefore.slice(0, 3).join(" ");
                }
              } else {
                extractedTopic = meaningfulBefore.slice(0, 4).join(" ");
              }
            } else {
              extractedTopic = "Course";
            }
          }
        }

        const t = extractedTopic || "Course";
        const isIoT = t.toLowerCase().includes("iot");
        const topicWord = isIoT ? "IoT and embedded systems" : t;

        // Custom template questions per category
        const templates = {
          faculty: [
            `How would you rate the faculty's teaching quality and session delivery in ${topicWord}?`,
            `Rate the instructor's ability to clarify practical doubts during the ${t} sessions.`,
            `How interactive and engaging were the lecturing sessions for ${t}?`,
            `How responsive was the mentor to student queries regarding ${t} modules?`
          ],
          infrastructure: [
            `How would you rate the laboratory infrastructure and hardware availability for ${t}?`,
            `Rate the quality and speed of internet connectivity in the ${t} labs.`,
            `How satisfied are you with the comfort and cleanliness of the ${t} classroom?`,
            `Rate the access to reference resources and computing facilities for ${t}.`
          ],
          content: [
            `How relevant is the ${t} course content to real-world industrial projects?`,
            `Rate the quality of course material, syllabus structure, and notes provided for ${t}.`,
            `How satisfied are you with the hands-on practical exercises designed for ${t}?`,
            `Rate the pacing and sequence of training modules in this ${t} curriculum.`
          ],
          placement: [
            `How would you rate the placement support and career guidance provided for the ${t} batch?`,
            `Rate the frequency and standard of company placement drives for ${t} candidates.`,
            `How helpful were mock interviews and resume preparation sessions for ${t}?`,
            `Rate the overall readiness and industry alignment you acquired through this ${t} program.`
          ]
        };

        const fallbackList: string[] = [];

        // Build list based on parsed counts or proportional defaults
        if (facultyCount > 0 || infraCount > 0 || contentCount > 0 || placementCount > 0) {
          for (let i = 0; i < facultyCount; i++) fallbackList.push(templates.faculty[i % templates.faculty.length]);
          for (let i = 0; i < infraCount; i++) fallbackList.push(templates.infrastructure[i % templates.infrastructure.length]);
          for (let i = 0; i < contentCount; i++) fallbackList.push(templates.content[i % templates.content.length]);
          for (let i = 0; i < placementCount; i++) fallbackList.push(templates.placement[i % templates.placement.length]);
        } else {
          // Proportionate distribution if no category counts specified
          const target = totalQuestionsCount > 0 ? totalQuestionsCount : 5;
          const categories = ["faculty", "infrastructure", "content", "placement"];
          for (let i = 0; i < target; i++) {
            const cat = categories[i % categories.length] as keyof typeof templates;
            const index = Math.floor(i / categories.length);
            fallbackList.push(templates[cat][index % templates[cat].length]);
          }
        }

        if (totalQuestionsCount > 0 && fallbackList.length < totalQuestionsCount) {
          const all = [...templates.faculty, ...templates.infrastructure, ...templates.content, ...templates.placement];
          let index = 0;
          while (fallbackList.length < totalQuestionsCount) {
            const q = all[index % all.length];
            if (!fallbackList.includes(q)) {
              fallbackList.push(q);
            }
            index++;
          }
        }

        questions = totalQuestionsCount > 0 ? fallbackList.slice(0, totalQuestionsCount) : fallbackList;
      }
    }

    // Fallback questions if parsing empty or failed
    if (!Array.isArray(questions) || questions.length === 0) {
      questions = [
        `How would you rate the overall explanation on ${campaignTitle}?`,
        "How clear were the class materials and examples provided?",
        "Rate the instructor's responsiveness to custom queries and doubts.",
        "How satisfied are you with the scheduling and pacing of the course?"
      ];
    }

    // Cap size to 15 and clean strings
    questions = questions.slice(0, 15).map(q => q.trim()).filter(Boolean);
    if (questions.length < 3) {
      questions.push(`How helpful was the practical lab work about ${campaignTitle}?`);
      questions.push("Would you recommend this course module to future batches?");
    }

    // Format title cleanly
    campaignTitle = campaignTitle.replace(/[\-\:\,\s]+$/, "").trim();
    campaignTitle = campaignTitle
      .split(/(\s+|\-+)/)
      .map(part => {
        if (!part) return "";
        if (/^[\s\-]+$/.test(part)) return part;
        if (part.toLowerCase() === "iot") return "IoT";
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .filter(Boolean)
      .join("");

    if (!campaignTitle.toLowerCase().endsWith("feedback form")) {
      campaignTitle += " Feedback Form";
    }

    // Save to database
    const created = await createCampaignStore(campaignTitle, questions);
    res.status(201).json({
      id: created.id,
      title: created.title,
      questions: created.form_schema,
      form_schema: created.form_schema,
      created_at: created.created_at
    });
  } catch (e: any) {
    console.error("Gemini Form Generation failed:", e);
    res.status(500).json({
      error: e.message || "An unexpected error occurred during AI form generation."
    });
  }
});

// API - Update campaign feedback form
app.put("/api/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  const { title, form_schema } = req.body;

  try {
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ error: "Please enter a valid feedback form title." });
    }

    if (!Array.isArray(form_schema)) {
      return res.status(400).json({ error: "Feedback form questions must be provided as a list." });
    }

    const cleanQuestions = form_schema
      .map((question) => typeof question === "string" ? question.trim() : "")
      .filter(Boolean)
      .slice(0, 15);

    if (cleanQuestions.length === 0) {
      return res.status(400).json({ error: "Please keep at least one feedback question." });
    }

    const updated = await updateCampaignStore(id, title.trim(), cleanQuestions);
    if (!updated) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to update feedback form" });
  }
});

// API - Delete campaign feedback form
app.delete("/api/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await getCampaignByIdStore(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    await deleteCampaignStore(id);
    res.json({ success: true, message: "Campaign and its responses deleted successfully" });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to delete campaign" });
  }
});


// API - Get analytics for a campaign
app.get("/api/campaigns/:id/analytics", async (req, res) => {
  const { id } = req.params;
  try {
    const campaign = await getCampaignByIdStore(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const responses = await getResponsesByCampaignIdStore(id);
    const totalResponses = responses.length;

    // Map questions to computes
    const averages: QuestionAverage[] = campaign.form_schema.map((question, index) => {
      const ratingList = responses
        .map(r => r.ratings[index.toString()])
        .filter(val => typeof val === "number" && val >= 1 && val <= 5);

      const total = ratingList.length;
      const sum = ratingList.reduce((acc, curr) => acc + curr, 0);
      const average = total > 0 ? parseFloat((sum / total).toFixed(2)) : 0;

      // Initialize distribution counts
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingList.forEach(r => {
        if (r >= 1 && r <= 5) {
          distribution[r as 1 | 2 | 3 | 4 | 5]++;
        }
      });

      return {
        question,
        index,
        average,
        total,
        distribution
      };
    });

    // Filter and collect open-ended suggestions
    const suggestions = responses
      .filter(r => r.suggestion_text && r.suggestion_text.trim() !== "")
      .map(r => ({
        id: r.id,
        text: r.suggestion_text!,
        created_at: r.created_at
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const analytics: CampaignAnalytics = {
      campaign,
      totalResponses,
      averages,
      suggestions
    };

    res.json(analytics);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to calculate analytics" });
  }
});

// API - Post student response feedback
app.post("/api/campaigns/:id/responses", async (req, res) => {
  const { id } = req.params;
  const { ratings, suggestion_text } = req.body;

  try {
    const campaign = await getCampaignByIdStore(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!ratings || typeof ratings !== "object") {
      return res.status(400).json({ error: "Submissions must include numerical ratings." });
    }

    // Validates ratings match form schema indexes
    const cleanRatings: Record<string, number> = {};
    campaign.form_schema.forEach((_, idx) => {
      const value = ratings[idx.toString()];
      if (value === undefined || value === null) {
        cleanRatings[idx.toString()] = 5; // Default score if omitted
      } else {
        const num = Number(value);
        cleanRatings[idx.toString()] = isNaN(num) || num < 1 ? 1 : num > 5 ? 5 : num;
      }
    });

    const responseRecord = await createResponseStore(campaign, cleanRatings, suggestion_text);
    res.status(201).json({ success: true, response: responseRecord });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to submit anonymous feedback response" });
  }
});

export default app;
