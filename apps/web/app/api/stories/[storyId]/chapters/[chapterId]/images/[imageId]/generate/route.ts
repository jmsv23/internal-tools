import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@repo/db";
import { generateImage, type ImageGenerationInput } from "@/lib/runpod/client";
import { downloadAndStoreImage } from "@/lib/image-generation/storage";

export async function POST(
  _request: NextRequest,
  { params }: { params: { storyId: string; chapterId: string; imageId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { storyId, chapterId, imageId } = await params;

    // Verify the image exists and belongs to the user
    const image = await (db as any).chapterImage.findFirst({
      where: {
        id: imageId,
        chapter: {
          id: chapterId,
          story: {
            id: storyId,
            userId: session.user.id,
          },
        },
      },
      include: {
        chapter: true,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: "Image not found", code: "IMAGE_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (image.status === "processing") {
      return NextResponse.json(
        { error: "Image is already being processed", code: "IMAGE_PROCESSING" },
        { status: 400 }
      );
    }

    // Mark image as processing
    await (db as any).chapterImage.update({
      where: { id: imageId },
      data: { status: "processing", errorMessage: null },
    });

    const generationInput: ImageGenerationInput = {
      prompt: image.prompt,
      size: "1920*1080",
    };

    const result = await generateImage(generationInput);

    if (result.status === "FAILED" || result.error) {
      await (db as any).chapterImage.update({
        where: { id: imageId },
        data: {
          status: "failed",
          errorMessage: result.error || "Generation failed",
        },
      });

      return NextResponse.json(
        { error: result.error || "Generation failed", code: "GENERATION_FAILED" },
        { status: 500 }
      );
    }

    let storedImageUrl = result.output?.result;
    if (result.output?.result) {
      const storageResult = await downloadAndStoreImage({
        imageUrl: result.output.result,
        imageId: image.id,
        format: "png",
        customPath: `stories/${storyId}/images/${chapterId}/${image.imageNumber}.png`,
      });

      if (storageResult.success && storageResult.objectPath) {
        storedImageUrl = storageResult.objectPath;
      }
    }

    const updatedImage = await (db as any).chapterImage.update({
      where: { id: imageId },
      data: {
        status: "ready",
        imageUrl: `/api/images/${storedImageUrl}`,
      },
    });

    return NextResponse.json({
      success: true,
      image: updatedImage,
    });
  } catch (error) {
    console.error("Error generating single image:", error);

    try {
      const { imageId } = await params;
      await (db as any).chapterImage.update({
        where: { id: imageId },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch {}

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
