import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@repo/db";
import { deleteObject } from "@/lib/store/minio";
import { logger } from "@repo/logger";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
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

    // 2. Get the audio and verify it belongs to the current user
    const audio = await db.audio.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!audio) {
      return NextResponse.json(
        { error: "Audio not found", code: "AUDIO_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. Delete file from MinIO if it exists
    if (audio.audioUrl) {
      try {
        await deleteObject(
          audio.audioUrl,
          process.env.MINIO_BUCKET_NAME || "internal-tools-dev"
        );
        logger.info(`Audio file deleted from MinIO`, {
          audioId: audio.id,
          audioUrl: audio.audioUrl,
          userId: session.user.id,
        });
      } catch (minioError) {
        logger.error(`Failed to delete audio file from MinIO`, {
          error: minioError,
          audioId: audio.id,
          audioUrl: audio.audioUrl,
          userId: session.user.id,
        });
        // Continue with DB deletion even if MinIO deletion fails
      }
    }

    // 4. Delete the audio record from database
    await db.audio.delete({
      where: {
        id,
      },
    });

    logger.info(`Audio record deleted from database`, {
      audioId: audio.id,
      userId: session.user.id,
    });

    // 5. Return success response
    return NextResponse.json({
      message: "Audio deleted successfully",
      code: "AUDIO_DELETED",
    });
  } catch (error) {
    logger.error("Error deleting audio", {
      error,
      audioId: id,
    });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}