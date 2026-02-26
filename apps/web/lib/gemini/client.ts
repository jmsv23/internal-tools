import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({ apiKey });
}

// Lazy initialization to allow build without API key
let _gemini: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!_gemini) {
    _gemini = getGeminiClient();
  }
  return _gemini;
}

export const GEMINI_MODELS = {
  flashLite: "gemini-2.5-flash-lite",
  flash: "gemini-2.5-flash",
} as const;

export const GENERATION_CONFIG = {
  contentValidation: {
    temperature: 0.1,
    maxOutputTokens: 256,
  },
  storyGeneration: {
    temperature: 0.8,
    maxOutputTokens: 8192,
  },
} as const;
