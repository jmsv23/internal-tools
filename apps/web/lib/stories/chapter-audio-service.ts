import { logger } from "@repo/logger";
import { generateGeminiTTSToStorage } from "@/lib/gemini/tts-generation";

export interface GenerateChapterAudioInput {
  storyId: string;
  chapterId: string;
  db: any;
}

export interface GenerateChapterAudioResult {
  success: boolean;
  audioUrl?: string;
  audioSizeBytes?: number;
  error?: string;
}

export async function generateChapterAudioService({
  storyId,
  chapterId,
  db,
}: GenerateChapterAudioInput): Promise<GenerateChapterAudioResult> {
  try {
    logger.info("Starting chapter audio generation", { storyId, chapterId });

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

    // 2. Check if content is ready
    if (chapter.contentStatus !== "ready") {
      return {
        success: false,
        error: "Chapter content must be generated first",
      };
    }

    // 3. Check if audio is already ready — return success so pipeline can continue
    if (chapter.audioStatus === "ready") {
      return {
        success: true,
        audioUrl: chapter.audioUrl ?? undefined,
      };
    }

    // 4. Check if TTS content is available
    if (!chapter.ttsContent || chapter.ttsContent.trim() === "") {
      return {
        success: false,
        error: "No TTS content available",
      };
    }

    // 5. Update status to processing
    await db.chapter.update({
      where: { id: chapterId },
      data: { audioStatus: "processing" },
    });

    // 6. Generate audio
    const audioResult = await generateGeminiTTSToStorage({
      text: chapter.ttsContent,
      language: "spanish", // Default language as specified in the plan
      voiceId: "algenib", // Default voice as specified in the plan
      audioId: chapterId,
    });

    if (!audioResult.success || !audioResult.audioObjectPath) {
      // Update status to failed
      await db.chapter.update({
        where: { id: chapterId },
        data: { audioStatus: "failed" },
      });

      return {
        success: false,
        error: audioResult.error || "Failed to generate audio",
      };
    }

    // 7. Update chapter with audio URL and status
    await db.chapter.update({
      where: { id: chapterId },
      data: {
        audioUrl: audioResult.audioObjectPath,
        audioStatus: "ready",
      },
    });

    logger.info("Chapter audio generated successfully", { 
      storyId, 
      chapterId, 
      audioSizeBytes: audioResult.audioSizeBytes 
    });

    return {
      success: true,
      audioUrl: audioResult.audioObjectPath,
      audioSizeBytes: audioResult.audioSizeBytes,
    };

  } catch (error) {
    logger.error("Error generating chapter audio", { 
      storyId, 
      chapterId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Attempt to update status to failed
    try {
      if (chapterId) {
        await db.chapter.update({
          where: { id: chapterId },
          data: { audioStatus: "failed" },
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
      error: error instanceof Error ? error.message : "Chapter audio generation failed",
    };
  }
}