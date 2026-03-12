import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { generateImagePrompts } from "@/lib/stories/media-analysis";
import { downloadStream } from "@/lib/store/minio";

interface RouteParams {
  params: Promise<{
    storyId: string;
    chapterId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { storyId, chapterId } = await params;
  
  try {
    // 1. Auth check
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Get chapter and verify ownership
    const chapter = await db.chapter.findFirst({
      where: {
        id: chapterId,
        story: {
          id: storyId,
          userId: session.user.id,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found", code: "CHAPTER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. Check if audio is ready and URL is available
    if (chapter.audioStatus !== "ready") {
      return NextResponse.json(
        {
          error: "Chapter audio must be generated first",
          code: "AUDIO_NOT_READY"
        },
        { status: 400 }
      );
    }

    if (!chapter.audioUrl) {
      return NextResponse.json(
        {
          error: "Chapter audio URL is missing",
          code: "AUDIO_URL_MISSING"
        },
        { status: 400 }
      );
    }

    // 4. Check if image prompts are already ready (avoid duplicate generation)
    if (chapter.imagePromptsStatus === "ready") {
      return NextResponse.json(
        { 
          error: "Image prompts already generated", 
          code: "IMAGE_PROMPTS_ALREADY_READY" 
        },
        { status: 400 }
      );
    }

    // 5. Check if required content is available
    if (!chapter.ttsContent || chapter.ttsContent.trim() === "") {
      return NextResponse.json(
        { 
          error: "No TTS content available", 
          code: "NO_TTS_CONTENT" 
        },
        { status: 400 }
      );
    }

    if (!chapter.fullContent || chapter.fullContent.trim() === "") {
      return NextResponse.json(
        { 
          error: "No full chapter content available", 
          code: "NO_FULL_CONTENT" 
        },
        { status: 400 }
      );
    }

    // 6. Update status to processing
    await db.chapter.update({
      where: { id: chapterId },
      data: { imagePromptsStatus: "processing" },
    });

    // 7. Download audio from MinIO and convert to base64
    let audioBase64: string;
    let audioMimeType: string;
    try {
      const audioStream = await downloadStream(chapter.audioUrl);
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      audioBase64 = Buffer.concat(chunks).toString("base64");
      audioMimeType = chapter.audioUrl.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
    } catch (error) {
      console.error("Failed to download chapter audio from MinIO:", error);

      await db.chapter.update({
        where: { id: chapterId },
        data: { imagePromptsStatus: "failed" },
      });

      return NextResponse.json(
        {
          error: "Failed to download chapter audio for analysis",
          code: "AUDIO_FETCH_FAILED"
        },
        { status: 500 }
      );
    }

    // 8. Parse chapter content and generate image prompts
    let chapterContent;
    try {
      chapterContent = JSON.parse(chapter.fullContent);
    } catch (error) {
      console.error("Failed to parse chapter full content:", error);

      await db.chapter.update({
        where: { id: chapterId },
        data: {
          imagePromptsStatus: "failed",
        },
      });

      return NextResponse.json(
        {
          error: "Invalid chapter content format",
          code: "INVALID_CONTENT_FORMAT"
        },
        { status: 400 }
      );
    }

    // Ensure we have the required fields for the media analysis service
    const mediaAnalysisInput = {
      ttsContent: chapter.ttsContent,
      ...chapterContent,
    };

    const imagePromptsResult = await generateImagePrompts(mediaAnalysisInput, audioBase64, audioMimeType);

    // 9. Store JSON string in chapter.imagePrompts
    const imagePromptsJson = JSON.stringify(imagePromptsResult);

    // 10. Create ChapterImage records for each prompt entry
    const chapterImagesData = imagePromptsResult.imagePrompts.map((prompt) => ({
      chapterId: chapterId,
      imageNumber: prompt.index,
      prompt: prompt.prompt,
      timestamp: prompt.timestamp,
      duration: prompt.duration,
      status: "pending" as const,
    }));

    // 11. Update chapter and create ChapterImage records in a transaction
    const [updatedChapter] = await db.$transaction([
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

    // 12. Return success response
    return NextResponse.json({
      success: true,
      imagePrompts: imagePromptsResult,
      chapter: updatedChapter,
    });

  } catch (error) {
    console.error("Error generating chapter image prompts:", error);
    
    // Attempt to update status to failed if chapterId is available
    try {
      if (chapterId) {
        await db.chapter.update({
          where: { id: chapterId },
          data: { imagePromptsStatus: "failed" },
        });
      }
    } catch (updateError) {
      console.error("Failed to update chapter status to failed:", updateError);
    }

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
