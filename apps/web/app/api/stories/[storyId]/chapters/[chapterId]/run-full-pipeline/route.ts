import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { getChapterQueue } from "@/lib/queue";
import { logger } from "@repo/logger";

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

    // 3. Check if chapter has seed data (required for pipeline)
    if (!chapter.title || !chapter.context) {
      return NextResponse.json(
        { 
          error: "Chapter must have seed data (title, context) before running pipeline", 
          code: "MISSING_SEED_DATA" 
        },
        { status: 400 }
      );
    }

    // 4. Check if a pipeline job is already running
    const queue = getChapterQueue();
    const existingJob = await queue.getJob(`pipeline-${chapterId}`);
    
    if (existingJob && (await existingJob.getState()) === 'active') {
      return NextResponse.json(
        { 
          error: "Pipeline already running for this chapter", 
          code: "PIPELINE_ALREADY_RUNNING" 
        },
        { status: 409 }
      );
    }

    // 5. Add job to BullMQ queue
    const job = await queue.add('chapter-pipeline', {
      storyId,
      chapterId,
      userId: session.user.id,
    }, {
      jobId: `pipeline-${chapterId}`, // Prevent duplicate jobs
      attempts: 1, // Pipeline jobs should not retry automatically
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    logger.info('Chapter pipeline job queued', { 
      jobId: job.id, 
      chapterId, 
      storyId, 
      userId: session.user.id 
    });

    // 6. Return immediate response with job details
    return NextResponse.json({
      success: true,
      jobId: job.id,
      chapterId,
      storyId,
      status: 'queued',
      message: 'Full pipeline job queued for processing. The pipeline will run steps 2-6 sequentially: Content → Audio → Image Prompts → Images → Package.',
    });

  } catch (error) {
    console.error("Error queuing chapter pipeline job:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}