import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { generateChapterSeeds } from "@/lib/stories/chapter-seed-generation";

interface CreateStoryBody {
  title: string;
  idea: string;
  chapterCount?: number;
}

export async function GET(request: NextRequest) {
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

    // 2. Get user stories with chapter counts and progress
    const stories = await db.story.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        chapters: {
          select: {
            id: true,
            contentStatus: true,
            audioStatus: true,
            imagePromptsStatus: true,
            imagesStatus: true,
            videoStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 3. Calculate progress for each story
    const storiesWithProgress = stories.map((story) => {
      const totalChapters = story.chapters.length;
      if (totalChapters === 0) {
        return {
          ...story,
          chapterCount: 0,
          completedSteps: 0,
          totalSteps: 0,
          progressPercentage: 0,
        };
      }

      // Each chapter has 5 steps: content, audio, image prompts, images, video
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

      return {
        ...story,
        chapterCount: totalChapters,
        completedSteps,
        totalSteps,
        progressPercentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      };
    });

    // 4. Return stories
    return NextResponse.json({
      stories: storiesWithProgress,
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // 2. Parse and validate request body
    let body: CreateStoryBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body is required", code: "BODY_REQUIRED" },
        { status: 400 }
      );
    }

    if (!body.title || body.title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required", code: "TITLE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!body.idea || body.idea.trim() === "") {
      return NextResponse.json(
        { error: "Story idea is required", code: "IDEA_REQUIRED" },
        { status: 400 }
      );
    }

    if (body.chapterCount && (body.chapterCount < 1 || body.chapterCount > 20)) {
      return NextResponse.json(
        { error: "Chapter count must be between 1 and 20", code: "INVALID_CHAPTER_COUNT" },
        { status: 400 }
      );
    }

    // 3. Generate chapter seeds
    const chapterSeeds = await generateChapterSeeds(
      body.idea,
      body.chapterCount || 5
    );

    // 4. Create story with chapters
    const story = await db.story.create({
      data: {
        userId: session.user.id,
        title: body.title,
        idea: body.idea,
        chapterSeed: JSON.stringify(chapterSeeds),
        status: "ready",
        chapters: {
          create: chapterSeeds.map((seed, index) => ({
            chapterNumber: index + 1,
            title: seed.title,
            context: seed.context,
            conflict: seed.conflict,
            visualDescription: seed.visualDescription,
            climax: seed.climax,
            contentStatus: "pending",
            audioStatus: "pending",
            imagePromptsStatus: "pending",
            imagesStatus: "pending",
            videoStatus: "pending",
          })),
        },
      },
      include: {
        chapters: true,
      },
    });

    // 5. Return created story
    return NextResponse.json({
      story: {
        ...story,
        chapterCount: story.chapters.length,
        completedSteps: 0,
        totalSteps: story.chapters.length * 5,
        progressPercentage: 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating story:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message, 
          code: "STORY_CREATION_FAILED" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}