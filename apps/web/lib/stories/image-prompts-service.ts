import { logger } from "@repo/logger";
import { generateImagePrompts } from "@/lib/stories/media-analysis";
import type { ImagePrompts } from "./types";

export interface GenerateImagePromptsInput {
  storyId: string;
  chapterId: string;
  db: any;
}

export interface GenerateImagePromptsResult {
  success: boolean;
  imagePrompts?: ImagePrompts;
  error?: string;
}

export async function generateImagePromptsService({
  storyId,
  chapterId,
  db,
}: GenerateImagePromptsInput): Promise<GenerateImagePromptsResult> {
  try {
    logger.info("Starting chapter image prompts generation", { storyId, chapterId });

    // 1. Get chapter and verify it exists
    const chapter = await db.chapter.findFirst({
      where: { id: chapterId },
    });

    if (!chapter) {
      return {
        success: false,
        error: "Chapter not found",
      };
    }

    // 2. Check if audio is ready (audio timing needed as reference)
    if (chapter.audioStatus !== "ready") {
      return {
        success: false,
        error: "Chapter audio must be generated first",
      };
    }

    // 3. Check if image prompts are already ready
    if (chapter.imagePromptsStatus === "ready") {
      return {
        success: false,
        error: "Image prompts already generated",
      };
    }

    // 4. Check if required content is available
    if (!chapter.ttsContent || chapter.ttsContent.trim() === "") {
      return {
        success: false,
        error: "No TTS content available",
      };
    }

    if (!chapter.fullContent || chapter.fullContent.trim() === "") {
      return {
        success: false,
        error: "No full chapter content available",
      };
    }

    // 5. Update status to processing
    await db.chapter.update({
      where: { id: chapterId },
      data: { imagePromptsStatus: "processing" },
    });

    // 6. Parse chapter content and generate image prompts
    let chapterContent;
    try {
      chapterContent = JSON.parse(chapter.fullContent);
    } catch (error) {
      logger.error("Failed to parse chapter full content", { error });
      
      // Update status to failed
      await db.chapter.update({
        where: { id: chapterId },
        data: { imagePromptsStatus: "failed" },
      });

      return {
        success: false,
        error: "Invalid chapter content format",
      };
    }

    // Ensure we have the required fields for the media analysis service
    const mediaAnalysisInput = {
      ttsContent: chapter.ttsContent,
      ...chapterContent,
    };

    const imagePromptsResult = await generateImagePrompts(mediaAnalysisInput);

    // 7. Store JSON string in chapter.imagePrompts
    const imagePromptsJson = JSON.stringify(imagePromptsResult);

    // 8. Create ChapterImage records for each prompt entry
    const chapterImagesData = imagePromptsResult.imagePrompts.map((prompt) => ({
      chapterId: chapterId,
      imageNumber: prompt.index,
      prompt: prompt.prompt,
      timestamp: prompt.timestamp,
      duration: prompt.duration,
      status: "pending" as const,
    }));

    // 9. Update chapter and create ChapterImage records in a transaction
    await db.$transaction([
      db.chapter.update({
        where: { id: chapterId },
        data: {
          imagePrompts: imagePromptsJson,
          imagePromptsStatus: "ready",
        },
      }),
      db.chapterImage.createMany({
        data: chapterImagesData,
      }),
    ]);

    logger.info("Chapter image prompts generated successfully", { 
      storyId, 
      chapterId, 
      promptCount: imagePromptsResult.imagePrompts.length 
    });

    return {
      success: true,
      imagePrompts: imagePromptsResult,
    };

  } catch (error) {
    logger.error("Error generating chapter image prompts", { 
      storyId, 
      chapterId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Attempt to update status to failed
    try {
      if (chapterId) {
        await db.chapter.update({
          where: { id: chapterId },
          data: { imagePromptsStatus: "failed" },
        });
      }
    } catch (updateError) {
      logger.error("Failed to update chapter status to failed", { 
        storyId, 
        chapterId, 
        error: updateError instanceof Error ? updateError.message : String(updateError) 
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Chapter image prompts generation failed",
    };
  }
}