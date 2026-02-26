// cspell:ignore gemini kore laomedeia enceladus fenrir
import type { AudioLanguage } from "@/lib/audios/types";

export type GeminiVoiceId = "lucia" | "laura" | "luca" | "robert";

export interface GeminiVoice {
  id: GeminiVoiceId;
  name: string;
  geminiName: string;
  gender: "female" | "male";
  description: string;
  /** Languages this voice works well with (empty = all languages) */
  languages: AudioLanguage[];
}

export const GEMINI_VOICES: GeminiVoice[] = [
  {
    id: "lucia",
    name: "Lucia",
    geminiName: "Kore",
    gender: "female",
    description: "Warm and expressive, perfect for bringing stories to life with emotion",
    languages: [],
  },
  {
    id: "laura",
    name: "Laura",
    geminiName: "Laomedeia",
    gender: "female",
    description: "Musical and enchanting, ideal for fairy tales and whimsical adventures",
    languages: [],
  },
  {
    id: "luca",
    name: "Luca",
    geminiName: "Enceladus",
    gender: "male",
    description: "Deep and trustworthy, excellent for adventure and heroic stories",
    languages: [],
  },
  {
    id: "robert",
    name: "Robert",
    geminiName: "Fenrir",
    gender: "male",
    description: "Bold and animated, perfect for action-packed and exciting narratives",
    languages: [],
  },
] as const;

export const DEFAULT_GEMINI_VOICE_ID: GeminiVoiceId = "lucia";

/**
 * Get voices available for a specific language
 * If a voice has empty languages array, it's available for all languages
 */
export function getGeminiVoicesForLanguage(language: AudioLanguage): GeminiVoice[] {
  return GEMINI_VOICES.filter(
    (voice) => voice.languages.length === 0 || voice.languages.includes(language)
  );
}

/**
 * Get a voice by its ID
 */
export function getGeminiVoiceById(id: GeminiVoiceId): GeminiVoice | undefined {
  return GEMINI_VOICES.find((voice) => voice.id === id);
}
