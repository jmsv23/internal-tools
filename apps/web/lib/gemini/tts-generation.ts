// cspell:ignore gemini

import { logger } from "@repo/logger";
import {
  getGoogleCloudAccessToken,
  GEMINI_TTS_CONFIG,
  getGeminiVoiceById,
  getPromptForLanguage,
  getLanguageCode,
  DEFAULT_GEMINI_VOICE_ID,
  type GeminiTTSError,
  type GeminiVoiceId,
} from "./tts-client";
import type { AudioLanguage } from "@/lib/audios/types";
import { uploadStream } from "@/lib/store/minio";
import { chunkTextForTTS } from "@/lib/audios/text-chunking";

export interface GeminiTTSGenerationInput {
  text: string;
  language: AudioLanguage;
  voiceId?: GeminiVoiceId;
}

export interface GeminiTTSStorageResult {
  success: boolean;
  audioObjectPath?: string;
  audioSizeBytes?: number;
  error?: string;
  errorCode?: string;
}

export interface GeminiTTSStorageInput extends GeminiTTSGenerationInput {
  audioId: string;
}

interface GeminiTTSResponse {
  audioContent: string; // Base64 encoded audio
}

interface ChunkResult {
  success: boolean;
  audioBuffer?: Buffer;
  error?: string;
  errorCode?: string;
}

/**
 * Generate TTS audio using Gemini TTS API and upload directly to MinIO storage
 * Handles chunking, sequential API calls, and MP3 concatenation
 * Returns the object path instead of a base64 data URL
 */
export async function generateGeminiTTSToStorage(
  input: GeminiTTSStorageInput
): Promise<GeminiTTSStorageResult> {
  const { text, language, voiceId = DEFAULT_GEMINI_VOICE_ID, audioId } = input;

  const chunks = chunkTextForTTS(text);
  if (chunks.length === 0) {
    return {
      success: false,
      error: "No text to generate audio for",
      errorCode: "NO_TEXT",
    };
  }

  const voice = getGeminiVoiceById(voiceId);
  if (!voice) {
    return {
      success: false,
      error: "Invalid voice selected",
      errorCode: "INVALID_VOICE",
    };
  }

  logger.info("Starting Gemini TTS generation for storage", {
    language,
    voiceId: voice.id,
    voiceName: voice.name,
    geminiVoice: voice.geminiName,
    chunkCount: chunks.length,
    textLength: text.length,
    audioId,
  });

  const audioBuffers: Buffer[] = [];

  try {
    // Get access token once for all chunks
    const accessToken = await getGoogleCloudAccessToken();

    // Process each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      logger.debug("Processing chunk", { chunkIndex: i + 1, chunkLength: chunk.length });

      const result = await generateGeminiChunkAudio(
        chunk,
        language,
        voice.geminiName,
        accessToken
      );

      if (!result.success || !result.audioBuffer) {
        logger.error("Chunk generation failed", {
          chunkIndex: i + 1,
          error: result.error,
          errorCode: result.errorCode,
        });
        return {
          success: false,
          error: result.error || "Failed to generate audio chunk",
          errorCode: result.errorCode,
        };
      }

      audioBuffers.push(result.audioBuffer);
    }

    // Concatenate all MP3 buffers
    const concatenatedAudio = Buffer.concat(audioBuffers);
    const audioSizeBytes = concatenatedAudio.length;

    const objectPath = `audio/${audioId}.mp3`;

    await uploadStream(objectPath, concatenatedAudio, concatenatedAudio.length, {
      contentType: "audio/mpeg",
      metadata: {
        audioId,
        voiceId: voice.id,
        voiceName: voice.name,
        geminiVoice: voice.geminiName,
        language,
        model: GEMINI_TTS_CONFIG.model,
      },
    });

    logger.info("Gemini TTS generation and upload completed", {
      audioId,
      chunkCount: chunks.length,
      audioSizeBytes,
      objectPath,
      voice: voice.name,
    });

    return {
      success: true,
      audioObjectPath: objectPath,
      audioSizeBytes,
    };
  } catch (error) {
    logger.error("Gemini TTS generation/storage error", {
      error: error instanceof Error ? error.message : String(error),
      audioId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gemini TTS generation failed",
      errorCode: "TTS_GENERATION_FAILED",
    };
  }
}

/**
 * Generate audio for a single text chunk using Gemini TTS API
 */
async function generateGeminiChunkAudio(
  text: string,
  language: AudioLanguage,
  geminiVoice: string,
  accessToken: string
): Promise<ChunkResult> {
  const prompt = getPromptForLanguage(language);
  const languageCode = getLanguageCode(language);

  const requestBody = {
    input: {
      prompt: prompt,
      text: text,
    },
    voice: {
      languageCode: languageCode,
      name: geminiVoice,
      model_name: GEMINI_TTS_CONFIG.model,
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  };

  const response = await fetch(GEMINI_TTS_CONFIG.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-goog-user-project": process.env.GOOGLE_CLOUD_PROJECT_ID || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Gemini TTS API error", {
      status: response.status,
      statusText: response.statusText,
      response: errorText,
    });

    let errorMessage = `Gemini TTS API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = JSON.parse(errorText) as GeminiTTSError;
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: "GEMINI_TTS_API_ERROR",
    };
  }

  let data: GeminiTTSResponse;
  try {
    data = (await response.json()) as GeminiTTSResponse;
  } catch {
    logger.error("Failed to parse Gemini TTS API response as JSON");
    return {
      success: false,
      error: "Invalid JSON response from Gemini TTS API",
      errorCode: "INVALID_RESPONSE",
    };
  }

  if (!data.audioContent) {
    logger.error("No audio content in Gemini TTS response");
    return {
      success: false,
      error: "No audio content in Gemini TTS response",
      errorCode: "NO_AUDIO_CONTENT",
    };
  }

  const audioBuffer = Buffer.from(data.audioContent, "base64");

  return {
    success: true,
    audioBuffer,
  };
}
