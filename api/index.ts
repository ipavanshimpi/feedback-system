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
app.get("/api/campaigns", (req, res) => {
  try {
    const list = getCampaigns();
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to load campaigns list" });
  }
});

// API - Get single campaign
app.get("/api/campaigns/:id", (req, res) => {
  const { id } = req.params;
  try {
    const campaign = getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to load campaign" });
  }
});

// API - Create new campaign via Gemini prompt
app.post("/api/campaigns", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "Please enter a valid topic or prompt." });
  }

  try {
    let questions: string[] = [];
    
    // Extract title early so it can be used in local fallbacks and Gemini calls
    let campaignTitle = prompt.trim();
    const exactTitleMatch = prompt.match(/exact title:\s*["']([^"']+)["']/i);
    if (exactTitleMatch && exactTitleMatch[1]) {
      campaignTitle = exactTitleMatch[1];
    } else {
      const quoteMatch = prompt.match(/"([^"]{10,120})"/);
      if (quoteMatch && quoteMatch[1]) {
        campaignTitle = quoteMatch[1];
      }
    }

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

    const apiKey = process.env.GEMINI_API_KEY;
    const hasApiKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";

    if (hasApiKey) {
      const ai = getGeminiClient();
      console.log(`Querying Gemini to generate feedback form for topic: "${prompt}"`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Create feedback questions and title for the topic: "${prompt}"`,
        config: {
          systemInstruction: 
            "You are an API that generates course evaluation campaigns. The user will provide a topic or prompt.\n" +
            "Generate a professional JSON object with two fields:\n" +
            "1. 'title': A clean, concise, elegant campaign/course title. CRITICAL RULE: If the user's prompt contains or specifies a title (e.g. in quotes or as a clear title like 'Advanced Technical Training & Mentorship Feedback Survey'), you MUST use that exact title string without modifying, shortening, or altering it.\n" +
            "2. 'questions': A valid JSON array of rating question strings. Focus on standard quantitative metrics. CRITICAL RULE: If the user's prompt requests a specific number of questions (e.g., exactly 10 rating questions) or lists specific dimensions, you MUST generate exactly that requested number of questions (up to 15) addressing those specific items and dimensions. Otherwise, generate a list of 4 to 8 high-quality questions.\n" +
            "Return ONLY the valid JSON object. No markdown syntax, no extra commentary.",
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

      const text = response.text?.trim() || "{}";
      let parsedData: { title?: string; questions?: string[] } = {};
      try {
        parsedData = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse Gemini output:", text, parseError);
      }

      campaignTitle = parsedData.title?.trim() || campaignTitle;
      questions = parsedData.questions || [];
    } else {
      console.log("No valid GEMINI_API_KEY configured. Falling back to local template questions generator.");
      
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
        const lowerTopic = prompt.toLowerCase();
        
        if (lowerTopic.includes("course") || lowerTopic.includes("class") || lowerTopic.includes("training") || lowerTopic.includes("workshop") || lowerTopic.includes("seminar")) {
          questions = [
            `How would you rate the overall structure of the ${campaignTitle}?`,
            "How clear and understandable were the instructor's explanations?",
            "Rate the relevance and helpfulness of the hands-on exercises or assignments.",
            "How satisfied are you with the pacing and schedule of the sessions?",
            "How well did this program meet your expectations?"
          ];
        } else if (lowerTopic.includes("product") || lowerTopic.includes("app") || lowerTopic.includes("software") || lowerTopic.includes("tool")) {
          questions = [
            `How would you rate the ease of use and user interface of ${campaignTitle}?`,
            "How satisfied are you with the features and capabilities provided?",
            "How would you rate the performance, speed, and reliability?",
            "Rate the helpfulness of the documentation, onboarding, or customer support.",
            "How likely are you to recommend this product to a colleague?"
          ];
        } else if (lowerTopic.includes("event") || lowerTopic.includes("conference") || lowerTopic.includes("meetup")) {
          questions = [
            `How would you rate the quality of the speakers and sessions at ${campaignTitle}?`,
            "How satisfied were you with the venue, logistics, or platform used?",
            "Rate the networking opportunities and interaction with other attendees.",
            "How would you rate the overall value and learning from the event?",
            "How likely are you to attend our future events?"
          ];
        } else {
          questions = [
            `How satisfied are you with the overall quality and experience of ${campaignTitle}?`,
            "How clear was the communication and guidance provided?",
            "Rate the responsiveness and support of the coordinators/instructors.",
            "How relevant was this content to your professional or personal needs?",
            "Would you recommend this program or activity to others?"
          ];
        }
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

    // Save to database
    const created = createCampaign(campaignTitle, questions);
    res.status(201).json(created);
  } catch (e: any) {
    console.error("Gemini Form Generation failed:", e);
    res.status(500).json({
      error: e.message || "An unexpected error occurred during AI form generation."
    });
  }
});

// API - Get analytics for a campaign
app.get("/api/campaigns/:id/analytics", (req, res) => {
  const { id } = req.params;
  try {
    const campaign = getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const responses = getResponsesByCampaignId(id);
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
app.post("/api/campaigns/:id/responses", (req, res) => {
  const { id } = req.params;
  const { ratings, suggestion_text } = req.body;

  try {
    const campaign = getCampaignById(id);
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

    const responseRecord = createResponse(id, cleanRatings, suggestion_text);
    res.status(201).json({ success: true, response: responseRecord });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to submit anonymous feedback response" });
  }
});

export default app;
