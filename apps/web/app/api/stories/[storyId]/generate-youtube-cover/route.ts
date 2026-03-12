import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateImage } from "@/lib/runpod/client";
import { downloadAndStoreImage } from "@/lib/image-generation/storage";

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

    const body = await request.json();
    const { coverId, prompt } = body;

    if (!coverId || !prompt) {
      return NextResponse.json(
        { error: "coverId and prompt are required", code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const result = await generateImage({
      prompt,
      size: "1280*720",
    });

    if (result.status === "FAILED" || result.error) {
      return NextResponse.json(
        { error: result.error || "Image generation failed", code: "GENERATION_FAILED" },
        { status: 400 }
      );
    }

    let imageUrl = result.output?.result;
    if (result.output?.result) {
      const storageResult = await downloadAndStoreImage({
        imageUrl: result.output.result,
        imageId: coverId,
        format: "png",
        customPath: `stories/${storyId}/youtube-covers/${coverId}.png`,
      });

      if (storageResult.success && storageResult.objectPath) {
        imageUrl = storageResult.objectPath;
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
    });

  } catch (error) {
    console.error("Error generating YouTube cover:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
