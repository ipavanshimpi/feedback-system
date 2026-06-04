import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

// Load .env.local first if it exists, otherwise fall back to .env
const localEnvPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  createResponse,
  getResponsesByCampaignId
} from "./server/db";
import { CampaignAnalytics, QuestionAverage } from "./src/types";

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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

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
      let campaignTitle = prompt.trim();

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

        campaignTitle = parsedData.title?.trim() || prompt.trim();
        questions = parsedData.questions || [];
      } else {
        console.log("No valid GEMINI_API_KEY configured. Falling back to local template questions generator.");
        const lowerTopic = prompt.toLowerCase();
        
        if (lowerTopic.includes("course") || lowerTopic.includes("class") || lowerTopic.includes("training") || lowerTopic.includes("workshop") || lowerTopic.includes("seminar")) {
          questions = [
            `How would you rate the overall structure of the ${prompt}?`,
            "How clear and understandable were the instructor's explanations?",
            "Rate the relevance and helpfulness of the hands-on exercises or assignments.",
            "How satisfied are you with the pacing and schedule of the sessions?",
            "How well did this program meet your expectations?"
          ];
        } else if (lowerTopic.includes("product") || lowerTopic.includes("app") || lowerTopic.includes("software") || lowerTopic.includes("tool")) {
          questions = [
            `How would you rate the ease of use and user interface of ${prompt}?`,
            "How satisfied are you with the features and capabilities provided?",
            "How would you rate the performance, speed, and reliability?",
            "Rate the helpfulness of the documentation, onboarding, or customer support.",
            "How likely are you to recommend this product to a colleague?"
          ];
        } else if (lowerTopic.includes("event") || lowerTopic.includes("conference") || lowerTopic.includes("meetup")) {
          questions = [
            `How would you rate the quality of the speakers and sessions at ${prompt}?`,
            "How satisfied were you with the venue, logistics, or platform used?",
            "Rate the networking opportunities and interaction with other attendees.",
            "How would you rate the overall value and learning from the event?",
            "How likely are you to attend our future events?"
          ];
        } else {
          questions = [
            `How satisfied are you with the overall quality and experience of ${prompt}?`,
            "How clear was the communication and guidance provided?",
            "Rate the responsiveness and support of the coordinators/instructors.",
            "How relevant was this content to your professional or personal needs?",
            "Would you recommend this program or activity to others?"
          ];
        }
      }

      // Fallback questions if parsing empty or failed
      if (!Array.isArray(questions) || questions.length === 0) {
        questions = [
          `How would you rate the overall explanation on ${prompt}?`,
          "How clear were the class materials and examples provided?",
          "Rate the instructor's responsiveness to custom queries and doubts.",
          "How satisfied are you with the scheduling and pacing of the course?"
        ];
      }

      // Cap size to 15 and clean strings
      questions = questions.slice(0, 15).map(q => q.trim()).filter(Boolean);
      if (questions.length < 3) {
        // Pads if less than 3
        questions.push(`How helpful was the practical lab work about ${campaignTitle}?`);
        questions.push("Would you recommend this course module to future batches?");
      }

      // Ensure that if the prompt itself is a short clean line, we prioritize using it exactly as the title
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

      // If the prompt explicitly mentions exact title: "..." (in the user's request) let's extract it if possible
      const exactTitleMatch = prompt.match(/exact title:\s*["']([^"']+)["']/i);
      if (exactTitleMatch && exactTitleMatch[1]) {
        campaignTitle = exactTitleMatch[1];
      } else {
        const quoteMatch = prompt.match(/"([^"]{10,120})"/);
        if (quoteMatch && quoteMatch[1]) {
          campaignTitle = quoteMatch[1];
        }
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

  // Vite Integration for static assets or SPA serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Fallback: Serve index.html for all other routers to support frontend navigation reload
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`simplesphere Full-Stack Server listening at http://localhost:${PORT}`);
  });
}

startServer();
