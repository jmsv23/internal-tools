// cspell:ignore gemini

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";
import { logger } from "@repo/logger";
import { headers } from "next/headers";
import { generateGeminiTTSToStorage } from "@/lib/gemini/tts-generation";
import { getGeminiVoiceById, type GeminiVoiceId } from "@/lib/gemini/tts-client";

interface RequestBody {
  voiceId?: GeminiVoiceId;
  content?: string;
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

    if (!body.content) {
      return NextResponse.json(
        { error: "Content is required", code: "CONTENT_REQUIRED" },
        { status: 400 }
      );
    }

    if (body.voiceId && !getGeminiVoiceById(body.voiceId)) {
      return NextResponse.json(
        { error: "Invalid voice selected", code: "INVALID_VOICE" },
        { status: 400 }
      );
    }

    // 3. Create audio record in database
    const audio = await db.audio.create({
      data: {
        userId: session.user.id,
        content: body.content,
        voiceId: body.voiceId,
        status: "processing",
      },
    });

    // 7. Generate Gemini TTS and upload to storage
    const ttsResult = await generateGeminiTTSToStorage({
      text: body.content,
      language: "spanish",
      voiceId: body.voiceId,
      audioId: audio.id,
    });

    if (!ttsResult.success || !ttsResult.audioObjectPath) {
      return NextResponse.json(
        {
          error: ttsResult.error || "Failed to generate audio",
          code: ttsResult.errorCode || "TTS_GENERATION_FAILED",
        },
        { status: 500 }
      );
    }

    // Simulate successful audio generation
    const audioObjectPath = `audio/${audio.id}.mp3`;

    // 8. Save object path to database and update status
    const updatedAudio = await db.audio.update({
      where: { id: audio.id },
      data: {
        audioUrl: audioObjectPath,
        status: "ready",
      },
    });


    // 9. Return response
    return NextResponse.json({
      audio: updatedAudio,
    });
  } catch (error) {
    logger.error("Error generating Gemini audio:", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
