/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Campaign {
  id: string;
  title: string;
  form_schema: string[]; // Array of question strings
  created_at: string;
}

export interface FeedbackResponse {
  id: string;
  campaign_id: string;
  ratings: Record<string, number>; // Key-value maps of question index (as string e.g. "0") to rate (1-5)
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
