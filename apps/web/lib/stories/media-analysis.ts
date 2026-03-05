import { Type } from "@google/genai";
import { getGemini, GEMINI_MODELS, GENERATION_CONFIG } from "@/lib/gemini/client";
import { IMAGE_PROMPT_MIN_COUNT, IMAGE_PROMPT_MAX_COUNT, IMAGE_STYLE_ANCHOR } from "./constants";
import type { ChapterContent, ImagePrompts } from "./types";

const IMAGE_PROMPTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    imagePrompts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          timestamp: { type: Type.STRING, description: "MM:SS format" },
          duration: { type: Type.NUMBER, description: "Seconds to display" },
          prompt: { type: Type.STRING, description: "Full image prompt including style anchor" },
        },
        required: ["index", "timestamp", "duration", "prompt"],
      },
    },
  },
  required: ["imagePrompts"],
} as const;

export async function generateImagePrompts(
  chapterContent: ChapterContent,
  audioBase64: string,
  audioMimeType: string,
): Promise<ImagePrompts> {
  const userContent = `
The audio file above is the generated chapter narration. Use it as the PRIMARY reference to determine the exact total duration and precise timing of each image prompt.

Chapter Scenes (for narrative context and visual reference only):
${JSON.stringify(chapterContent.scenes, null, 2)}

TTS Script (for scene/dialogue reference only — timing is derived from the audio):
${chapterContent.ttsContent}

Story State:
${JSON.stringify(chapterContent.storyState, null, 2)}

CDTs (Character Descriptive Templates):
${chapterContent.cdt ? JSON.stringify(chapterContent.cdt, null, 2) : "None"}

---
Analysis Requirements:
- Listen to the audio to determine the exact total duration
- Generate between ${IMAGE_PROMPT_MIN_COUNT} and ${IMAGE_PROMPT_MAX_COUNT} image prompts per minute of audio, distributed across the full duration
- Each prompt MUST include the style anchor: "${IMAGE_STYLE_ANCHOR}"
- Image prompts should capture key visual moments, emotional beats, and narrative highlights in sequential order, evenly distributed — do not cluster at the beginning
- Vary shot compositions and angles
- Ensure no clear faces as specified in style
`.trim();

  try {
    const response = await getGemini().models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: audioMimeType, data: audioBase64 } },
            { text: userContent },
          ],
        },
      ],
      config: {
        systemInstruction: `# 🎬 MEDIA ANALYSIS – GENERADOR DE PROMPTS DE IMAGEN

## 🧠 ROL

Eres un director de fotografía y experto en análisis de contenido visual especializado en narrativa cinematográfica.

Tu tarea es escuchar el audio de narración del capítulo y generar prompts de imagen optimizados para la generación de imágenes IA sincronizados con el audio.

---

## 🎧 FUENTE DE VERDAD: EL AUDIO

El archivo de audio proporcionado ES la narración final del capítulo. Es tu fuente principal y autoritativa para:
- Determinar la duración EXACTA total del capítulo
- Calcular los timestamps precisos de cada imagen
- Percibir el ritmo narrativo, pausas, y momentos de tensión emocional

El contenido textual (escenas, TTS, estado de la historia) es únicamente REFERENCIA de contexto visual y narrativo. Los tiempos deben derivarse del audio, no del texto.

---

## 🎯 GENERACIÓN DE PROMPTS

Debes generar ${IMAGE_PROMPT_MIN_COUNT}-${IMAGE_PROMPT_MAX_COUNT} prompts de imagen por minuto de audio con las siguientes características:

### **Cantidad exacta**: Entre ${IMAGE_PROMPT_MIN_COUNT} y ${IMAGE_PROMPT_MAX_COUNT} prompts por minuto de audio
### **Distribución temporal**:
- Escuchar el audio para determinar la duración real total
- Distribuir prompts a lo largo del capítulo de manera secuencial, evitando concentrarlos solo al inicio
- Cada prompt debe tener su timestamp en formato MM:SS alineado con lo que ocurre en el audio

### **Contenido de cada prompt**:
- **Descripción visual clara**: Personajes, acciones, entorno, iluminación
- **Estilo cinematográfico**: Encuadre, ángulo, composición
- **Estilo fijo ANCLADO**: Incluir obligatoriamente el estilo base: "${IMAGE_STYLE_ANCHOR}"
- **Detalles específicos**: Elementos que representen el momento clave de la escena

### **Duración por imagen**:
- Calcular duración en segundos basada en la extensión narrativa cubierta en el audio
- Valores típicos: 6 a 10 segundos por imagen
- Momentos climáticos pueden tener mayor duración

---

## 🎨 CRITERIOS VISUALES

### **Momentos a capturar**:
- Introducciones de personajes nuevos
- Escenas de acción clave
- Momentos emocionales intensos
- Revelaciones importantes
- Cliffhangers o giros narrativos

### **Composición cinematográfica**:
- Variar encuadres: close-up, medium shot, wide angle
- Especificar ángulos cuando sea relevante: low angle, high angle, Dutch angle
- Describir iluminación y atmósfera
- Incluir elementos simbólicos visuales

---

## 🔁 REGLAS ESENCIALES

1. **AUDIO PRIMERO**: Los timestamps deben reflejar lo que ocurre en el audio, no estimaciones de texto
2. **ANCLAR ESTILO**: CADA prompt debe incluir EXACTAMENTE el estilo base completo
3. **NO CARAS**: El estilo especifica "No clear faces" – respetar esta directiva
4. **DISTRIBUCIÓN**: Los prompts deben cubrir todo el capítulo, no concentrarse solo en el inicio
5. **ORIGINALIDAD**: Cada prompt debe describir una escena visual única
6. **CONTEXTUAL**: Los prompts deben ser coherentes con la narrativa analizada

---

## 📤 FORMATO DE SALIDA

Debes responder únicamente con un objeto JSON válido que contenga un array "imagePrompts" con los prompts generados.

Estructura de cada entrada:
- index: número consecutivo (0, 1, 2, ...)
- timestamp: formato MM:SS (ej: "00:45", "01:30", "02:15")
- duration: segundos (número decimal, ej: 4.5, 6.0, 3.0)
- prompt: descripción completa incluyendo el estilo anclado

No incluir texto adicional, explicaciones o formato markdown.`,
        temperature: GENERATION_CONFIG.mediaAnalysis.temperature,
        maxOutputTokens: GENERATION_CONFIG.mediaAnalysis.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPTS_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Failed to generate image prompts: No response text");
    }

    const result = JSON.parse(text) as ImagePrompts;
    
    // Validate the response structure
    if (!result.imagePrompts || !Array.isArray(result.imagePrompts)) {
      throw new Error("Invalid image prompts response: missing imagePrompts array");
    }

    // Validate each prompt entry
    for (const prompt of result.imagePrompts) {
      if (!prompt.prompt?.includes(IMAGE_STYLE_ANCHOR)) {
        throw new Error("Invalid image prompt: missing required style anchor");
      }
      if (!prompt.timestamp || !/^\d{1,2}:\d{2}$/.test(prompt.timestamp)) {
        throw new Error("Invalid image prompt: invalid timestamp format");
      }
      if (typeof prompt.duration !== 'number' || prompt.duration <= 0) {
        throw new Error("Invalid image prompt: invalid duration");
      }
      if (typeof prompt.index !== 'number') {
        throw new Error("Invalid image prompt: invalid index");
      }
    }

    return result;
  } catch (error) {
    console.error("Media analysis error:", error);
    throw new Error(`Failed to generate image prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
