import { logger } from "@repo/logger";
import { buildChapterPackage } from "@/lib/stories/package-builder";

export interface GenerateChapterPackageInput {
  storyId: string;
  chapterId: string;
  db: any;
}

export interface GenerateChapterPackageResult {
  success: boolean;
  videoConfigUrl?: string;
  error?: string;
}

export async function generateChapterPackageService({
  storyId,
  chapterId,
  db,
}: GenerateChapterPackageInput): Promise<GenerateChapterPackageResult> {
  try {
    logger.info("Starting chapter package generation", { storyId, chapterId });

    // 1. Verify chapter exists and get related data
    const chapter = await db.chapter.findFirst({
      where: { id: chapterId },
      include: {
        images: {
          orderBy: { imageNumber: 'asc' },
        },
      },
    });

    if (!chapter) {
      return {
        success: false,
        error: "Chapter not found",
      };
    }

    // 2. Check if package is already ready — return success so pipeline can continue
    if (chapter.videoStatus === "ready") {
      return {
        success: true,
        videoConfigUrl: chapter.videoConfigUrl ?? undefined,
      };
    }

    // 3. Check if all prerequisites are ready
    if (chapter.imagesStatus !== "ready") {
      return {
        success: false,
        error: "All images must be ready before generating package",
      };
    }

    if (!chapter.audioUrl) {
      return {
        success: false,
        error: "Chapter audio must be ready before generating package",
      };
    }

    // 4. Update chapter status to processing
    await db.chapter.update({
      where: { id: chapterId },
      data: { videoStatus: "processing" },
    });

    // 5. Build the package
    const packageResult = await buildChapterPackage({
      storyId,
      chapterId,
      chapterAudioUrl: chapter.audioUrl,
      chapterImages: chapter.images,
    });

    if (!packageResult.success) {
      // Update chapter status to failed
      await db.chapter.update({
        where: { id: chapterId },
        data: { 
          videoStatus: "failed",
          errorMessage: packageResult.error,
        },
      });

      return {
        success: false,
        error: packageResult.error || "Failed to build package",
      };
    }

    // 6. Update chapter with success
    await db.chapter.update({
      where: { id: chapterId },
      data: {
        videoStatus: "ready",
        videoConfigUrl: packageResult.zipObjectPath,
      },
    });

    logger.info("Chapter package generated successfully", { 
      storyId, 
      chapterId, 
      videoConfigUrl: packageResult.zipObjectPath 
    });

    return {
      success: true,
      videoConfigUrl: packageResult.zipObjectPath,
    };

  } catch (error) {
    logger.error("Error generating chapter package", { 
      storyId, 
      chapterId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Update chapter status to failed if possible
    try {
      if (chapterId) {
        await db.chapter.update({
          where: { id: chapterId },
          data: { 
            videoStatus: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } catch (updateError) {
      logger.error("Failed to update chapter status on error", { 
        storyId, 
        chapterId, 
        error: updateError instanceof Error ? updateError.message : String(updateError) 
      });
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Chapter package generation failed",
    };
  }
}