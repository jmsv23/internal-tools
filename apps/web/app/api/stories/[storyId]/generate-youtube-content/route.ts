import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { generateYouTubePublishingContent } from "@/lib/stories/youtube-service";

interface RouteParams {
  params: Promise<{
    storyId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { storyId } = await params;
  
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const story = await db.story.findFirst({
      where: {
        id: storyId,
        userId: session.user.id,
      },
      include: {
        chapters: {
          orderBy: {
            chapterNumber: "asc",
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json(
        { error: "Story not found", code: "STORY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const result = await generateYouTubePublishingContent({
      story,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || "Failed to generate YouTube content", 
          code: "YOUTUBE_CONTENT_GENERATION_FAILED" 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      message: "YouTube content generated successfully",
    });

  } catch (error) {
    console.error("Error generating YouTube content:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
