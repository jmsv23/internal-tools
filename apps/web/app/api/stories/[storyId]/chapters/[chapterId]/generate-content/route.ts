import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { generateChapterContentService } from "@/lib/stories/chapter-content-service";

interface RouteParams {
  params: {
    storyId: string;
    chapterId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { storyId, chapterId } = params;
  
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

    // 3. Call the content generation service
    const result = await generateChapterContentService({
      storyId,
      chapterId,
      db,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to generate chapter content", 
          code: "CONTENT_GENERATION_FAILED" 
        },
        { status: 400 }
      );
    }

    // 4. Return success response
    return NextResponse.json({
      success: true,
      content: result.content,
      message: "Chapter content generated successfully",
    });

  } catch (error) {
    console.error("Error generating chapter content:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}