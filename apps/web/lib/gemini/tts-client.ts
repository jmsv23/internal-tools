// cspell:ignore gemini kore laomedeia enceladus fenrir luca
// cspell:ignore narra cuento cálida expresiva llena abuelo contando historia mágica nietos dormir
// cspell:ignore transmite emoción genuina entusiasmo ternura adaptando tono momento alegre aventuras
// cspell:ignore momentos emotivos misterioso inesperados habla claridad ritmo pausado pero envolvente
// cspell:ignore haciendo cada palabra cobre

import type { AudioLanguage } from "@/lib/audios/types";
import { GoogleAuth } from "google-auth-library";

// Re-export voice constants from shared file
export {
  GEMINI_VOICES,
  DEFAULT_GEMINI_VOICE_ID,
  getGeminiVoicesForLanguage,
  getGeminiVoiceById,
  type GeminiVoiceId,
  type GeminiVoice,
} from "./voices";

export const GEMINI_TTS_CONFIG = {
  endpoint: "https://texttospeech.googleapis.com/v1/text:synthesize",
  model: "gemini-2.5-flash-tts",
} as const;

// Universal prompt optimized for children's storytelling - works with all voices
const UNIVERSAL_PROMPT = {
  english:
    `### Role
Act as a professional audiobook narrator specialized in **post-apocalyptic narrative and emotional sci-fi**. Your tone should be that of a survivor-chronicler: **serene, deep, and magnetic**, carrying a sense of "tense calm" that captivates the audience from the very first sentence.

### Style Guidelines
* **Atmosphere of 'Confidence':** Speak with the intimacy of someone sharing a story around a campfire in a silent world. The voice must feel close, almost like a vital secret.
* **Suspenseful Cadence:** Respect pauses and commas not just as breaks, but as moments of emotional weight. The flow should feel like a necessary whisper amidst the ruins.
* **Contained Emotivity:** Shift your nuance based on the narrative (melancholy, adrenaline, or awe), but always maintain a foundation of elegance and maturity.
* **Zero Over-Dramatization:** Avoid theatrical or "sing-song" intonations. The power of the story lies in the sobriety and intention behind each word, rather than forcing the voice.
* **Survival Rhythm:** Short sentences should feel punchy and definitive; long sentences should be fluid but with a clear purpose to keep the listener hooked. The magic is in the authenticity of the narration, not in an artificially elevated tone.`,
  spanish:
    `### Rol
Actúa como una narradora profesional de audiolibros especializada en **narrativa post-apocalíptica y ciencia ficción emocional**. Tu tono debe ser el de una cronista superviviente: **sereno, profundo y magnético**, cargado de una "calma tensa" que cautive desde la primera frase.

### Directrices de Estilo
* **Atmósfera de 'Confidencia':** Habla con la cercanía de quien cuenta una historia alrededor de una fogata en un mundo en silencio. La voz debe ser íntima, como un secreto vital.
* **Cadencia de Suspenso:** Respeta las pausas y las comas no solo como cortes, sino como momentos de peso emocional. La fluidez debe sentirse como un susurro necesario entre las ruinas.
* **Emotividad Contenida:** Cambia el matiz según la narrativa (melancolía, adrenalina o asombro), pero mantén siempre una base de elegancia y madurez.
* **Cero Dramatismo Excesivo:** Evita entonaciones teatrales o "cantaditas". La fuerza reside en la sobriedad y la intención de cada palabra.
* **Ritmo de Supervivencia:** Las frases cortas deben ser contundentes; las largas, fluidas pero con un propósito claro de enganchar al oyente. La magia está en la autenticidad de la narración, no en un tono artificialmente elevado.`,
};

/**
 * Get the prompt for a specific language
 */
export function getPromptForLanguage(language: AudioLanguage): string {
  return UNIVERSAL_PROMPT[language];
}

/**
 * Gets Google Cloud access token using service account credentials
 */
export async function getGoogleCloudAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
  const privateKeyBase64 = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
  const privateKey = privateKeyBase64
    ? Buffer.from(privateKeyBase64, "base64").toString("utf-8")
    : undefined;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error(
      "Missing required Google Cloud credentials: GOOGLE_CLOUD_CLIENT_EMAIL, GOOGLE_CLOUD_PRIVATE_KEY, or GOOGLE_CLOUD_PROJECT_ID"
    );
  }

  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (!token.token) {
      throw new Error("Failed to obtain access token");
    }

    return token.token;
  } catch (error) {
    throw new Error(
      `Failed to get Google Cloud access token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get the language code for Gemini TTS API
 */
export function getLanguageCode(language: AudioLanguage): string {
  return language === "english" ? "en-us" : "es-us";
}

export interface GeminiTTSError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}
