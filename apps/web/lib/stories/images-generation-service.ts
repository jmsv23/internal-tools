import { logger } from "@repo/logger";
import { generateImage, type ImageGenerationInput } from "@/lib/runpod/client";
import { downloadAndStoreImage } from "@/lib/image-generation/storage";

export interface GenerateChapterImagesInput {
  storyId: string;
  chapterId: string;
  db: any;
}

export interface GenerateChapterImagesResult {
  success: boolean;
  successCount?: number;
  failureCount?: number;
  totalProcessed?: number;
  imagesStatus?: "pending" | "processing" | "ready" | "failed";
  error?: string;
}

export async function generateChapterImagesService({
  storyId,
  chapterId,
  db,
}: GenerateChapterImagesInput): Promise<GenerateChapterImagesResult> {
  try {
    logger.info("Starting chapter images generation", { storyId, chapterId });

    // 1. Verify chapter exists and get related data
    const chapter = await db.chapter.findFirst({
      where: { id: chapterId },
      include: {
        story: true,
        images: true,
      },
    });

    if (!chapter) {
      return {
        success: false,
        error: "Chapter not found",
      };
    }

    // 2. Check if images are already all ready — return success so pipeline can continue
    if (chapter.imagesStatus === "ready") {
      return {
        success: true,
        successCount: chapter.images.length,
        failureCount: 0,
        totalProcessed: 0,
        imagesStatus: "ready",
      };
    }

    // 3. Check if image prompts are ready
    if (chapter.imagePromptsStatus !== "ready") {
      return {
        success: false,
        error: "Image prompts must be generated first",
      };
    }

    // 4. Get pending or failed images to generate
    const imagesToGenerate = chapter.images.filter(
      (img: any) => img.status === "pending" || img.status === "failed"
    );

    if (imagesToGenerate.length === 0) {
      return {
        success: false,
        error: "No images to generate",
      };
    }

    // 5. Update chapter status to processing
    await db.chapter.update({
      where: { id: chapterId },
      data: { imagesStatus: "processing" },
    });

    // 6. Process images sequentially
    let successCount = 0;
    let failureCount = 0;

    for (const image of imagesToGenerate) {
      try {
        // Update image status to processing
        await db.chapterImage.update({
          where: { id: image.id },
          data: { status: "processing" },
        });

        // Call RunPod API to generate image
        const generationInput: ImageGenerationInput = {
          prompt: image.prompt,
          size: "1920*1080", // Fixed size for story images
        };

        const result = await generateImage(generationInput);

        if (result.status === "FAILED" || result.error) {
          await db.chapterImage.update({
            where: { id: image.id },
            data: {
              status: "failed",
              errorMessage: result.error || "Generation failed",
            },
          });
          failureCount++;
          continue;
        }

        // Download and store image in MinIO
        let storedImageUrl = result.output?.result; // Default to original URL
        if (result.output?.result) {
          const storageResult = await downloadAndStoreImage({
            imageUrl: result.output.result,
            imageId: image.id,
            format: "png",
            customPath: `stories/${storyId}/images/${chapterId}/${image.imageNumber}.png`,
          });

          if (storageResult.success && storageResult.objectPath) {
            // Store the raw MinIO object path so the package builder can download it
            storedImageUrl = storageResult.objectPath;
          }
        }

        // Update image record with success
        await db.chapterImage.update({
          where: { id: image.id },
          data: {
            status: "ready",
            imageUrl: storedImageUrl,
          },
        });

        successCount++;
      } catch (error) {
        logger.error(`Error generating image ${image.id}`, { error });
        
        await db.chapterImage.update({
          where: { id: image.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
        
        failureCount++;
      }
    }

    // 7. Update chapter status based on results
    const finalImagesStatus = failureCount === 0 ? "ready" : "failed";
    
    await db.chapter.update({
      where: { id: chapterId },
      data: { imagesStatus: finalImagesStatus },
    });

    logger.info("Chapter images generation completed", { 
      storyId, 
      chapterId, 
      successCount, 
      failureCount, 
      totalProcessed: imagesToGenerate.length 
    });

    // 8. Return the result
    return {
      success: true,
      successCount,
      failureCount,
      totalProcessed: imagesToGenerate.length,
      imagesStatus: finalImagesStatus,
    };

  } catch (error) {
    logger.error("Error in bulk generate images", { 
      storyId, 
      chapterId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Chapter images generation failed",
    };
  }
}