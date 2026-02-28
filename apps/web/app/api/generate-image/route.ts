import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateImage, type ImageGenerationInput } from "@/lib/runpod/client";
import { headers } from "next/headers";
import { db } from "@repo/db";
import imageStyles from "@/lib/image-generation/image-styles.json";
import { downloadAndStoreImage } from "@/lib/image-generation/storage";

interface RequestBody {
  prompt: string;
  styleName?: string;
  negativePrompt?: string;
  size?: string;
  seed?: number;
}

export async function POST(request: NextRequest) {
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

    // 2. Parse request body
    let body: Partial<RequestBody> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body is required", code: "BODY_REQUIRED" },
        { status: 400 }
      );
    }

    if (!body.prompt || body.prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt is required", code: "PROMPT_REQUIRED" },
        { status: 400 }
      );
    }

    if (body.prompt.trim().length > 1000) {
      return NextResponse.json(
        { error: "Prompt must be less than 1000 characters", code: "PROMPT_TOO_LONG" },
        { status: 400 }
      );
    }

    if (body.negativePrompt && body.negativePrompt.length > 500) {
      return NextResponse.json(
        { error: "Negative prompt must be less than 500 characters", code: "NEGATIVE_PROMPT_TOO_LONG" },
        { status: 400 }
      );
    }

    // 3. Process style selection
    let finalPrompt = body.prompt.trim();
    let selectedStyle = null;
    
    if (body.styleName && body.styleName !== "none") {
      selectedStyle = imageStyles.find((style) => style.name === body.styleName);
      if (!selectedStyle) {
        return NextResponse.json(
          { error: "Invalid style selected", code: "INVALID_STYLE" },
          { status: 400 }
        );
      }
      // Replace {{subject}} with the user's prompt
      finalPrompt = selectedStyle.prompt.replace(/\{\{subject\}\}/g, body.prompt.trim());
    }

    // 4. Validate size format
    if (body.size && !/^\d+\*\d+$/.test(body.size)) {
      return NextResponse.json(
        { error: "Size format must be width*height (e.g., 1024*1024)", code: "INVALID_SIZE" },
        { status: 400 }
      );
    }

    // 5. Create database record for tracking
    const imageGeneration = await (db as any).imageGeneration.create({
      data: {
        userId: session.user.id,
        originalPrompt: body.prompt?.trim() || "",
        finalPrompt,
        styleName: selectedStyle?.name,
        negativePrompt: body.negativePrompt,
        size: body.size || "1024*1024",
        seed: body.seed || -1,
        status: "processing",
      },
    });

    // 6. Call RunPod API
    const generationInput: ImageGenerationInput = {
      prompt: finalPrompt,
      negative_prompt: body.negativePrompt,
      size: body.size || "1024*1024",
      seed: body.seed,
    };

    const result = await generateImage(generationInput);

    // 7. Update database with results
    if (result.status === "FAILED" || result.error) {
      await (db as any).imageGeneration.update({
        where: { id: imageGeneration.id },
        data: {
          status: "failed",
          errorMessage: result.error || "Generation failed",
        },
      });

      return NextResponse.json(
        {
          error: result.error || "Failed to generate image",
          code: "GENERATION_FAILED",
        },
        { status: 500 }
      );
    }

    // 8. Download and store image in MinIO
    let storedImageUrl = result.output?.result; // Default to original URL
    if (result.output?.result) {
      const storageResult = await downloadAndStoreImage({
        imageUrl: result.output.result,
        imageId: imageGeneration.id,
        format: "png",
      });

      if (storageResult.success && storageResult.objectPath) {
        storedImageUrl = `/api/images/${storageResult.objectPath}`;
      }
    }

    // 9. Update with successful result
    await (db as any).imageGeneration.update({
      where: { id: imageGeneration.id },
      data: {
        status: "ready",
        originalImageUrl: result.output?.result,
        imageUrl: storedImageUrl,
        cost: result.output?.cost,
        generationTimeMs: result.executionTime,
        delayTimeMs: result.delayTime,
        workerId: result.workerId,
      },
    });

    // 10. Return the result
    return NextResponse.json({
      id: imageGeneration.id,
      imageUrl: storedImageUrl,
      originalImageUrl: result.output?.result,
      cost: result.output?.cost,
      generationTime: result.executionTime,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve image generation history
export async function GET(request: NextRequest) {
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

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 3. Fetch user's image generations
    const generations = await (db as any).imageGeneration.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // 4. Return results
    return NextResponse.json({
      generations,
      hasMore: generations.length === limit,
    });
  } catch (error) {
    console.error("Error fetching image generations:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}