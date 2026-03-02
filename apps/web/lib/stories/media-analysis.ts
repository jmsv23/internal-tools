import { Type } from "@google/genai";
import { getGemini, GEMINI_MODELS, GENERATION_CONFIG } from "@/lib/gemini/client";
import { IMAGE_PROMPT_MIN_COUNT, IMAGE_PROMPT_MAX_COUNT, ESTIMATED_WORDS_PER_MINUTE, IMAGE_STYLE_ANCHOR } from "./constants";
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

export async function generateImagePrompts(chapterContent: ChapterContent): Promise<ImagePrompts> {
  const userContent = `
Chapter Content (TTS-ready for timing):
${chapterContent.ttsContent}

Full Chapter Content (including scenes):
${JSON.stringify(chapterContent.scenes, null, 2)}

Story State:
${JSON.stringify(chapterContent.storyState, null, 2)}

CDTs (Character Descriptive Templates):
${chapterContent.cdt ? JSON.stringify(chapterContent.cdt, null, 2) : "None"}

---
Analysis Requirements:
- Generate between ${IMAGE_PROMPT_MIN_COUNT} and ${IMAGE_PROMPT_MAX_COUNT} image prompts
- Calculate timing based on ${ESTIMATED_WORDS_PER_MINUTE} words per minute reading speed
- Each prompt MUST include the style anchor: "${IMAGE_STYLE_ANCHOR}"
- Distribute prompts throughout the entire chapter narrative
- Focus on key visual moments and emotional beats
- Vary shot compositions and angles
- Ensure no clear faces as specified in style
`.trim();

  try {
    const response = await getGemini().models.generateContent({
      model: GEMINI_MODELS.flash,
      contents: userContent,
      config: {
        systemInstruction: `# 🎬 MEDIA ANALYSIS – GENERADOR DE PROMPTS DE IMAGEN

## 🧠 ROL

Eres un director de fotografía y experto en análisis de contenido visual especializado en narrativa cinematográfica.

Tu tarea es analizar el contenido de un capítulo y generar prompts de imagen optimizados para la generación de imágenes IA.

---

## 📋 ANÁLISIS DE CONTENIDO

Analizarás el contenido completo del capítulo incluyendo:

- **Narrativa completa**: Escenas, diálogos y progresión dramática
- **Contenido TTS**: Versión limpia para audio, útil para calcular tiempos
- **Descripciones visuales**: Elementos de escena, personajes y atmósfera

---

## 🎯 GENERACIÓN DE PROMPTS

Debes generar ${IMAGE_PROMPT_MIN_COUNT}-${IMAGE_PROMPT_MAX_COUNT} prompts de imagen con las siguientes características:

### **Cantidad exacta**: Entre ${IMAGE_PROMPT_MIN_COUNT} y ${IMAGE_PROMPT_MAX_COUNT} prompts
### **Distribución temporal**: 
- Calcular duración estimada basada en ${ESTIMATED_WORDS_PER_MINUTE} palabras por minuto
- Distribuir prompts a lo largo del capítulo para cubrir momentos clave
- Cada prompt debe tener su timestamp en formato MM:SS

### **Contenido de cada prompt**:
- **Descripción visual clara**: Personajes, acciones, entorno, iluminación
- **Estilo cinematográfico**: Encuadre, ángulo, composición
- **Estilo fijo ANCLADO**: Incluir obligatoriamente el estilo base: "${IMAGE_STYLE_ANCHOR}"
- **Detalles específicos**: Elementos que representen el momento clave de la escena

### **Duración por imagen**:
- Calcular duración en segundos basada en la extensión narrativa cubierta
- Valores típicos: 3-8 segundos por imagen
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

1. **ANCLAR ESTILO**: CADA prompt debe incluir EXACTAMENTE el estilo base completo
2. **NO CARAS**: El estilo especifica "No clear faces" – respetar esta directiva
3. **DISTRIBUCIÓN**: Los prompts deben cubrir todo el capítulo, no concentrarse solo en el inicio
4. **ORIGINALIDAD**: Cada prompt debe describir una escena visual única
5. **CONTEXTUAL**: Los prompts deben ser coherentes con la narrativa analizada

---

## 📤 FORMATO DE SALIDA

Debes responder únicamente con un objeto JSON válido que contenga un array "imagePrompts" con los prompts generados.

Estructura de cada entrada:
- index: número consecutivo (0, 1, 2, ...)
- timestamp: formato MM:SS (ej: "00:45", "01:30", "02:15")
- duration: segundos (número decimal, ej: 4.5, 6.0, 3.0)
- prompt: descripción completa incluyendo el estilo anclado

No incluir texto adicional, explicaciones o formato markdown.`,
        temperature: GENERATION_CONFIG.storyGeneration.temperature,
        maxOutputTokens: GENERATION_CONFIG.storyGeneration.maxOutputTokens,
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