import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@repo/db";
import { buildChapterPackage } from "@/lib/stories/package-builder";

export async function POST(
  _request: NextRequest,
  { params }: { params: { storyId: string; chapterId: string } }
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
        images: {
          orderBy: { imageNumber: 'asc' },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found", code: "CHAPTER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. Check if all prerequisites are ready
    if (chapter.imagesStatus !== "ready") {
      return NextResponse.json(
        { 
          error: "All images must be ready before generating package", 
          code: "IMAGES_NOT_READY" 
        },
        { status: 400 }
      );
    }

    if (!chapter.audioUrl) {
      return NextResponse.json(
        { 
          error: "Chapter audio must be ready before generating package", 
          code: "AUDIO_NOT_READY" 
        },
        { status: 400 }
      );
    }

    // 4. Update chapter status to processing
    await (db as any).chapter.update({
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
      await (db as any).chapter.update({
        where: { id: chapterId },
        data: { 
          videoStatus: "failed",
          errorMessage: packageResult.error,
        },
      });

      return NextResponse.json(
        { 
          error: packageResult.error || "Failed to build package", 
          code: "PACKAGE_BUILD_FAILED" 
        },
        { status: 500 }
      );
    }

    // 6. Update chapter with success
    await (db as any).chapter.update({
      where: { id: chapterId },
      data: {
        videoStatus: "ready",
        videoConfigUrl: packageResult.zipObjectPath,
      },
    });

    // 7. Return the result
    return NextResponse.json({
      success: true,
      videoStatus: "ready",
      videoConfigUrl: packageResult.zipObjectPath,
    });
  } catch (error) {
    console.error("Error generating chapter package:", error);
    
    // Update chapter status to failed if possible
    try {
      const { storyId: _, chapterId } = params;
      await (db as any).chapter.update({
        where: { id: chapterId },
        data: { 
          videoStatus: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch (updateError) {
      console.error("Failed to update chapter status on error:", updateError);
    }
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
