import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@repo/db";
import { generateImage, type ImageGenerationInput } from "@/lib/runpod/client";
import { downloadAndStoreImage } from "@/lib/image-generation/storage";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
    // 1. Auth check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { storyId, chapterId } = await params;

    // 2. Verify chapter exists and belongs to user
    const chapter = await (db as any).chapter.findFirst({
      where: {
        id: chapterId,
        story: {
          id: storyId,
          userId: session.user.id,
        },
      },
      include: {
        story: true,
        images: true,
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found", code: "CHAPTER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. Check if image prompts are ready
    if (chapter.imagePromptsStatus !== "ready") {
      return NextResponse.json(
        { 
          error: "Image prompts must be generated first", 
          code: "IMAGE_PROMPTS_NOT_READY" 
        },
        { status: 400 }
      );
    }

    // 4. Get pending or failed images to generate
    const imagesToGenerate = chapter.images.filter(
      (img: any) => img.status === "pending" || img.status === "failed"
    );

    if (imagesToGenerate.length === 0) {
      return NextResponse.json(
        { 
          error: "No images to generate", 
          code: "NO_IMAGES_TO_GENERATE" 
        },
        { status: 400 }
      );
    }

    // 5. Update chapter status to processing
    await (db as any).chapter.update({
      where: { id: chapterId },
      data: { imagesStatus: "processing" },
    });

    // 6. Process images sequentially
    let successCount = 0;
    let failureCount = 0;

    const imagePromises = [];

    for (const image of imagesToGenerate) {
      try {
        // Update image status to processing
        await (db as any).chapterImage.update({
          where: { id: image.id },
          data: { status: "processing" },
        });

        // Call RunPod API to generate image
        const generationInput: ImageGenerationInput = {
          prompt: image.prompt,
          size: "1920*1080", // Fixed size for story images
        };

        imagePromises.push(generateImage(generationInput));
      } catch (error) {
        console.error(`Error preparing image generation for ${image.id}:`, error);
        await (db as any).chapterImage.update({
          where: { id: image.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
        failureCount++;
      }
    }

    // Wait for all image generation promises to complete
    try {
      const results = await Promise.allSettled(imagePromises);
      await Promise.all(results.map(async (result, index) => {
        const image = imagesToGenerate[index];
        if (result.status === "fulfilled") {
          const resultValue = result.value;
          if (resultValue.status === "FAILED" || resultValue.error) {
            await (db as any).chapterImage.update({
              where: { id: image.id },
              data: {
                status: "failed",
                errorMessage: resultValue.error || "Generation failed",
              },
            });
            failureCount++;
          } else {
            // Download and store image in MinIO
            let storedImageUrl: string | null = null;
            if (resultValue.output?.result) {
              const storageResult = await downloadAndStoreImage({
                imageUrl: resultValue.output.result,
                imageId: image.id,
                format: "png",
                customPath: `stories/${storyId}/images/${chapterId}/${image.imageNumber}.png`,
              });

              if (storageResult.success && storageResult.objectPath) {
                storedImageUrl = `/api/images/${storageResult.objectPath}`;
              }
            }

            if (storedImageUrl) {
              await (db as any).chapterImage.update({
                where: { id: image.id },
                data: {
                  status: "ready",
                  imageUrl: storedImageUrl,
                },
              });
              successCount++;
            } else {
              await (db as any).chapterImage.update({
                where: { id: image.id },
                data: {
                  status: "failed",
                  errorMessage: `Failed to store image in MinIO ${resultValue?.output?.result ? `after generation: ${resultValue.output.result}` : "after generation, no output URL"}`,
                },
              });
              failureCount++;
            }
          }
        }
        if (result.status === "rejected") {
          console.error(`Image generation promise rejected for image ${image.id}:`, result.reason);
          await (db as any).chapterImage.update({
            where: { id: image.id },
            data: {
              status: "failed",
              errorMessage: result.reason instanceof Error ? result.reason.message : "Unknown error",
            },
          });
          failureCount++;
        }
      }));
    } catch (error) {
      await (db as any).chapter.update({
        where: { id: chapterId },
        data: { imagesStatus: "failed" },
      });
    }

    const finalImagesStatus = 'ready';
    
    await (db as any).chapter.update({
      where: { id: chapterId },
      data: { imagesStatus: finalImagesStatus },
    });

    // 8. Return the result
    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      totalProcessed: imagesToGenerate.length,
      imagesStatus: finalImagesStatus,
    });
  } catch (error) {
    console.error("Error in bulk generate images:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
