import { Type } from "@google/genai";
import { getGemini, GEMINI_MODELS, GENERATION_CONFIG } from "../gemini/client";
import { CHAPTER_SEED_DEFAULT_COUNT } from "./constants";
import type { ChapterSeed } from "./types";

const CHAPTER_SEED_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          context: { type: Type.STRING },
          conflict: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
          climax: { type: Type.STRING },
        },
        required: ["title", "context", "conflict", "visualDescription", "climax"],
      },
    },
  },
  required: ["chapters"],
} as const;

interface ChapterSeedResponse {
  chapters: ChapterSeed[];
}

export async function generateChapterSeeds(
  idea: string,
  chapterCount: number = CHAPTER_SEED_DEFAULT_COUNT
): Promise<ChapterSeed[]> {
  try {
    const userPrompt = `IDEA DE HISTORIA:
${idea}

NÚMERO DE CAPÍTULOS:
${chapterCount}

Genera ${chapterCount} semillas de capítulos basadas en esta idea.`;

    const response = await getGemini().models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: userPrompt,
      config: {
        systemInstruction: "You are a chapter seed generator that creates structured story chapter outlines in Spanish.",
        temperature: GENERATION_CONFIG.storyGeneration.temperature,
        maxOutputTokens: GENERATION_CONFIG.storyGeneration.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: CHAPTER_SEED_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("No response from chapter seed generation");
    }

    const result = JSON.parse(text) as ChapterSeedResponse;
    
    if (!result.chapters || !Array.isArray(result.chapters)) {
      throw new Error("Invalid chapter seed response structure");
    }

    // Validate each chapter has all required fields
    const validatedChapters = result.chapters.map((chapter, index) => {
      const requiredFields = ["title", "context", "conflict", "visualDescription", "climax"];
      const missingFields = requiredFields.filter(field => !chapter[field as keyof ChapterSeed]);
      
      if (missingFields.length > 0) {
        throw new Error(`Chapter ${index + 1} is missing required fields: ${missingFields.join(", ")}`);
      }

      return {
        title: chapter.title,
        context: chapter.context,
        conflict: chapter.conflict,
        visualDescription: chapter.visualDescription,
        climax: chapter.climax,
      };
    });

    return validatedChapters;
  } catch (error) {
    console.error("Chapter seed generation error:", error);
    throw new Error(`Failed to generate chapter seeds: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}