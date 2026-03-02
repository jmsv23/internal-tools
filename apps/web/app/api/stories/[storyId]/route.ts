import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";

interface RouteParams {
  params: {
    storyId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { storyId } = params;

    // 2. Get story with full details
    const story = await db.story.findFirst({
      where: {
        id: storyId,
        userId: session.user.id,
      },
      include: {
        chapters: {
          include: {
            images: true,
          },
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

    // 3. Calculate story progress
    const totalChapters = story.chapters.length;
    const totalSteps = totalChapters * 5;
    const completedSteps = story.chapters.reduce((acc, chapter) => {
      let steps = 0;
      if (chapter.contentStatus === "ready") steps++;
      if (chapter.audioStatus === "ready") steps++;
      if (chapter.imagePromptsStatus === "ready") steps++;
      if (chapter.imagesStatus === "ready") steps++;
      if (chapter.videoStatus === "ready") steps++;
      return acc + steps;
    }, 0);

    // 4. Return story with progress
    return NextResponse.json({
      story: {
        ...story,
        chapterCount: totalChapters,
        completedSteps,
        totalSteps,
        progressPercentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { storyId } = params;

    // 2. Verify story ownership
    const story = await db.story.findFirst({
      where: {
        id: storyId,
        userId: session.user.id,
      },
    });

    if (!story) {
      return NextResponse.json(
        { error: "Story not found", code: "STORY_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. TODO: MinIO cleanup
    // This will be implemented when we add storage functionality
    // For now, we just delete from database

    // 4. Delete story (cascade delete will remove chapters and chapter images)
    await db.story.delete({
      where: {
        id: storyId,
      },
    });

    // 5. Return success
    return NextResponse.json({
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}