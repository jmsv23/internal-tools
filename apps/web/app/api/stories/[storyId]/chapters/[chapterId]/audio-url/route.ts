import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@repo/db";
import { getPresignedUrl } from "@/lib/store/minio";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string; chapterId: string }> }
) {
  try {
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
    const audioPath = request.nextUrl.searchParams.get("audioPath");

    if (!audioPath) {
      return NextResponse.json(
        { error: "audioPath query parameter is required", code: "MISSING_AUDIO_PATH" },
        { status: 400 }
      );
    }

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

    const signedUrl = await getPresignedUrl(audioPath, {
      expirySeconds: 60 * 60, // 1 hour
    });

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Error generating audio signed URL:", error);

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
