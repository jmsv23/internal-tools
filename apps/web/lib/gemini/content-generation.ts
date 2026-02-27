import { getGemini, GEMINI_MODELS } from "./client";
import { SYSTEM_PROMPTS, type SystemPromptId } from "./system-prompts";

export interface ContentGenerationInput {
  systemPromptId?: SystemPromptId;
  secondarySystemPrompt?: string;
  userPrompt: string;
}

export interface ContentGenerationResult {
  success: boolean;
  content?: string;
  error?: string;
}

export async function generateContent(
  input: ContentGenerationInput
): Promise<ContentGenerationResult> {
  try {
    // Get the base system prompt or use a default
    let baseSystemPrompt = "You are a helpful AI assistant.";
    if (input.systemPromptId) {
      const prompt = SYSTEM_PROMPTS.find(p => p.id === input.systemPromptId);
      if (prompt) {
        baseSystemPrompt = prompt.prompt;
      }
    }

    // Combine system prompts
    const fullSystemPrompt = input.secondarySystemPrompt
      ? `${baseSystemPrompt}\n\n${input.secondarySystemPrompt}`
      : baseSystemPrompt;

    // Generate content using Gemini
    const response = await getGemini().models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: input.userPrompt,
      config: {
        systemInstruction: fullSystemPrompt,
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    });

    const content = response.text?.trim();
    if (!content) {
      return {
        success: false,
        error: "Failed to generate content",
      };
    }

    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error("Content generation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Content generation failed",
    };
  }
}