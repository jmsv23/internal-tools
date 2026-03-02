import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@repo/db";
import { getPresignedUrl, downloadStream } from "@/lib/store/minio";

export async function GET(
  _request: NextRequest,
  { params }: { params: { storyId: string; chapterId: string } }
) {
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

    const { storyId, chapterId } = params;

    // 2. Verify chapter exists and belongs to user
    const chapter = await (db as any).chapter.findFirst({
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

    // 3. Check if package is ready
    if (chapter.videoStatus !== "ready" || !chapter.videoConfigUrl) {
      return NextResponse.json(
        { 
          error: "Package is not ready for download", 
          code: "PACKAGE_NOT_READY" 
        },
        { status: 400 }
      );
    }

    // 4. Generate presigned URL for download
    const presignedUrl = await getPresignedUrl(chapter.videoConfigUrl, {
      expirySeconds: 60 * 60 * 24, // 24 hours
    });

    if (!presignedUrl) {
      return NextResponse.json(
        { 
          error: "Failed to generate download URL", 
          code: "DOWNLOAD_URL_FAILED" 
        },
        { status: 500 }
      );
    }

    // 5. Option 1: Redirect to presigned URL (client-side download)
    // return NextResponse.redirect(presignedUrl);

    // 6. Option 2: Stream the file through the backend (for additional control)
    try {
      const fileStream = await downloadStream(chapter.videoConfigUrl);
      
      // Set appropriate headers for ZIP download
      const headers = new Headers();
      headers.set('Content-Type', 'application/zip');
      headers.set('Content-Disposition', `attachment; filename="chapter-${chapterId}-package.zip"`);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');

      // Return the file stream directly
      return new NextResponse(fileStream as any, {
        status: 200,
        headers,
      });
    } catch (streamError) {
      console.error("Error streaming file:", streamError);
      
      // Fall back to presigned URL if streaming fails
      return NextResponse.redirect(presignedUrl);
    }
  } catch (error) {
    console.error("Error downloading chapter package:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}