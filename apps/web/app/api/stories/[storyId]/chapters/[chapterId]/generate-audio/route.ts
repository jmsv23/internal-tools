import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { generateGeminiTTSToStorage } from "@/lib/gemini/tts-generation";

interface RouteParams {
  params: {
    storyId: string;
    chapterId: string;
  };
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

    // 3. Check if content is ready
    if (chapter.contentStatus !== "ready") {
      return NextResponse.json(
        { 
          error: "Chapter content must be generated first", 
          code: "CONTENT_NOT_READY" 
        },
        { status: 400 }
      );
    }

    // 4. Check if audio is already ready (avoid duplicate generation)
    if (chapter.audioStatus === "ready") {
      return NextResponse.json(
        { 
          error: "Audio already generated", 
          code: "AUDIO_ALREADY_READY" 
        },
        { status: 400 }
      );
    }

    // 5. Check if TTS content is available
    if (!chapter.ttsContent || chapter.ttsContent.trim() === "") {
      return NextResponse.json(
        { 
          error: "No TTS content available", 
          code: "NO_TTS_CONTENT" 
        },
        { status: 400 }
      );
    }

    // 6. Update status to processing
    await db.chapter.update({
      where: { id: chapterId },
      data: { audioStatus: "processing" },
    });

    // 7. Generate audio
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
        data: { 
          audioStatus: "failed",
        },
      });

      return NextResponse.json(
        { 
          error: audioResult.error || "Failed to generate audio", 
          code: "AUDIO_GENERATION_FAILED" 
        },
        { status: 500 }
      );
    }

    // 8. Update chapter with audio URL and status
    const updatedChapter = await db.chapter.update({
      where: { id: chapterId },
      data: {
        audioUrl: audioResult.audioObjectPath,
        audioStatus: "ready",
      },
    });

    // 9. Return success response
    return NextResponse.json({
      success: true,
      audioUrl: audioResult.audioObjectPath,
      audioSizeBytes: audioResult.audioSizeBytes,
      chapter: updatedChapter,
    });

  } catch (error) {
    console.error("Error generating chapter audio:", error);
    
    // Attempt to update status to failed if chapterId is available
    try {
      if (chapterId) {
        await db.chapter.update({
          where: { id: chapterId },
          data: { audioStatus: "failed" },
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
