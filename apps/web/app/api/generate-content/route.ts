import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateContent } from "@/lib/gemini/content-generation";
import { SYSTEM_PROMPTS } from "@/lib/gemini/system-prompts";
import { headers } from "next/headers";

interface RequestBody {
  systemPromptId?: string;
  secondarySystemPrompt?: string;
  userPrompt?: string;
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
    let body: RequestBody = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body is required", code: "BODY_REQUIRED" },
        { status: 400 }
      );
    }

    if (!body.userPrompt || body.userPrompt.trim() === "") {
      return NextResponse.json(
        { error: "User prompt is required", code: "USER_PROMPT_REQUIRED" },
        { status: 400 }
      );
    }

    if (body.systemPromptId && body.systemPromptId !== "none" && !SYSTEM_PROMPTS.find(p => p.id === body.systemPromptId)) {
      return NextResponse.json(
        { error: "Invalid system prompt selected", code: "INVALID_SYSTEM_PROMPT" },
        { status: 400 }
      );
    }

    // 3. Generate content
    const result = await generateContent({
      systemPromptId: body.systemPromptId === "none" ? undefined : body.systemPromptId as any,
      secondarySystemPrompt: body.secondarySystemPrompt,
      userPrompt: body.userPrompt,
    });

    if (!result.success || !result.content) {
      return NextResponse.json(
        {
          error: result.error || "Failed to generate content",
          code: "CONTENT_GENERATION_FAILED",
        },
        { status: 500 }
      );
    }

    // 4. Return the generated content
    return NextResponse.json({
      content: result.content,
    });
  } catch (error) {
    console.error("Error generating content:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}