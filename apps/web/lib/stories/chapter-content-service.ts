import { getGemini, GEMINI_MODELS } from "@/lib/gemini/client";
import { Type } from "@google/genai";
import { SYSTEM_PROMPTS } from "@/lib/gemini/system-prompts";
import { logger } from "@repo/logger";
import type { ChapterContent } from "./types";

export interface GenerateChapterContentInput {
  storyId: string;
  chapterId: string;
  db: any;
}

export interface GenerateChapterContentResult {
  success: boolean;
  content?: ChapterContent;
  error?: string;
}

// Chapter content schema for Gemini structured output
const CHAPTER_CONTENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    cdt: {
      type: Type.ARRAY,
      description: "Character Descriptive Templates (only for Chapter 1 or new characters)",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Character name (e.g. LEO)" },
          description: { type: Type.STRING, description: "Static physical description in English" },
        },
        required: ["name", "description"],
      },
    },
    scenes: {
      type: Type.ARRAY,
      description: "Exactly 5 scenes",
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.INTEGER },
          narrative: { type: Type.STRING, description: "Full narrative + dialogue in Spanish" },
        },
        required: ["number", "narrative"],
      },
    },
    ttsContent: { type: Type.STRING, description: "Complete TTS-ready version in Spanish. Only narration and dialogue, no scene labels, no technical descriptions, natural pauses, clean emotional flow." },
    storyState: {
      type: Type.OBJECT,
      properties: {
        worldState: { type: Type.ARRAY, items: { type: Type.STRING } },
        characterState: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              emotionalState: { type: Type.STRING },
              internalShift: { type: Type.STRING },
            },
            required: ["name", "emotionalState", "internalShift"],
          },
        },
        lastEvent: { type: Type.STRING },
        openThreads: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["worldState", "characterState", "lastEvent", "openThreads"],
    },
  },
  required: ["scenes", "ttsContent", "storyState"],
};

export async function generateChapterContentService({
  storyId,
  chapterId,
  db,
}: GenerateChapterContentInput): Promise<GenerateChapterContentResult> {
  try {
    logger.info("Starting chapter content generation", { storyId, chapterId });

    // 1. Get chapter and verify it has seed data
    const chapter = await db.chapter.findFirst({
      where: { id: chapterId },
      include: {
        story: true,
      },
    });

    if (!chapter) {
      return {
        success: false,
        error: "Chapter not found",
      };
    }

    // Get previous chapter for story state continuity
    const previousChapter = chapter.chapterNumber > 1
      ? await db.chapter.findFirst({
          where: {
            storyId: chapter.storyId,
            chapterNumber: chapter.chapterNumber - 1,
          },
        })
      : null;

    // 2. Check if content is already ready — return success so pipeline can continue
    if (chapter.contentStatus === "ready") {
      return {
        success: true,
      };
    }

    // 3. Check if content is being processed
    if (chapter.contentStatus === "processing") {
      return {
        success: false,
        error: "Chapter content generation already in progress",
      };
    }

    // 4. Update status to processing
    await db.chapter.update({
      where: { id: chapterId },
      data: { contentStatus: "processing" },
    });

    // 5. Get the master-mistery-writer-v2 system prompt
    const systemPrompt = SYSTEM_PROMPTS.find(p => p.id === "master-mistery-writer-v2");
    if (!systemPrompt) {
      await db.chapter.update({
        where: { id: chapterId },
        data: { contentStatus: "failed" },
      });
      
      return {
        success: false,
        error: "Master mystery writer prompt not found",
      };
    }

    // 6. Build the user prompt with chapter seed data
    const userPrompt = buildChapterPrompt(chapter, previousChapter);

    // 7. Generate content using Gemini with JSON schema
    const response = await getGemini().models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt.prompt,
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: CHAPTER_CONTENT_SCHEMA,
      },
    });

    let content: ChapterContent;
    try {
      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error("No content generated");
      }
      
      content = JSON.parse(responseText) as ChapterContent;
      
      // Validate required fields
      if (!content.scenes || !content.ttsContent || !content.storyState) {
        throw new Error("Missing required fields in generated content");
      }
    } catch (error) {
      logger.error("Failed to parse or validate chapter content", { 
        storyId, 
        chapterId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      await db.chapter.update({
        where: { id: chapterId },
        data: { contentStatus: "failed" },
      });
      
      return {
        success: false,
        error: "Invalid content format: " + (error instanceof Error ? error.message : String(error)),
      };
    }

    // 8. Store the content in the database
    await db.chapter.update({
      where: { id: chapterId },
      data: {
        fullContent: JSON.stringify(content),
        ttsContent: content.ttsContent,
        cdtContent: content.cdt ? JSON.stringify(content.cdt) : null,
        storyState: JSON.stringify(content.storyState),
        contentStatus: "ready",
      },
    });

    logger.info("Chapter content generated successfully", { 
      storyId, 
      chapterId, 
      scenesCount: content.scenes.length,
      ttsContentLength: content.ttsContent.length
    });

    return {
      success: true,
      content,
    };

  } catch (error) {
    logger.error("Error generating chapter content", { 
      storyId, 
      chapterId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Attempt to update status to failed
    try {
      await db.chapter.update({
        where: { id: chapterId },
        data: { contentStatus: "failed" },
      });
    } catch (updateError) {
      logger.error("Failed to update chapter status to failed", { 
        storyId, 
        chapterId, 
        error: updateError instanceof Error ? updateError.message : String(updateError) 
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Chapter content generation failed",
    };
  }
}

function buildChapterPrompt(chapter: any, previousChapter: any): string {
  // Extract previous chapter story state if available
  let previousStoryState = "";
  if (previousChapter?.storyState) {
    try {
      const storyState = JSON.parse(previousChapter.storyState);
      previousStoryState = `Previous Chapter Story State:\n` +
        `World State: ${storyState.worldState.join(', ')}\n` +
        `Last Event: ${storyState.lastEvent}\n` +
        `Open Threads: ${storyState.openThreads.join(', ')}\n`;
    } catch {
      // Ignore parsing errors
    }
  }

  return `Generate content for chapter ${chapter.chapterNumber} with the following details:

Chapter Title: ${chapter.title}
Context: ${chapter.context}
Conflict: ${chapter.conflict}
Visual Description: ${chapter.visualDescription}
Climax: ${chapter.climax}

${previousStoryState}

Please generate complete chapter content including exactly 5 scenes, character development, and TTS-ready narration in Spanish. All content should be in Spanish as this is for a Spanish-language YouTube channel.`;
}