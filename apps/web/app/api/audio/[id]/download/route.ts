import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@repo/db";
import { getPresignedUrl } from "@/lib/store/minio";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!audio) {
      return NextResponse.json(
        { error: "Audio not found", code: "AUDIO_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. Check if audio is ready
    if (audio.status !== "ready" || !audio.audioUrl) {
      return NextResponse.json(
        { error: "Audio is not ready for download", code: "AUDIO_NOT_READY" },
        { status: 400 }
      );
    }

    // 4. Generate signed URL from MinIO
    const presignedUrl = await getPresignedUrl(
      audio.audioUrl,
      { expirySeconds: 3600 }, // 1 hour expiry
      process.env.MINIO_BUCKET_NAME || "internal-tools-dev"
    );

    if (!presignedUrl) {
      return NextResponse.json(
        { error: "Failed to generate download URL", code: "DOWNLOAD_URL_GENERATION_FAILED" },
        { status: 500 }
      );
    }

    // 5. Return the signed URL
    return NextResponse.json({
      url: presignedUrl,
      filename: `audio-${audio.id}.mp3`,
      audioId: audio.id,
    });
  } catch (error) {
    console.error("Error generating audio download URL:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
