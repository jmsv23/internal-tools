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
The audio file above is the generated chapter narration. Use it as the PRIMARY and ONLY reference for timing — listen carefully to place each image at the EXACT millisecond a phrase begins in the audio.

Chapter Scenes (for narrative context and visual reference only):
${JSON.stringify(chapterContent.scenes, null, 2)}

TTS Script (for scene/dialogue reference only — use to identify which phrases correspond to which scenes):
${chapterContent.ttsContent}

Story State:
${JSON.stringify(chapterContent.storyState, null, 2)}

CDTs (Character Descriptive Templates):
${chapterContent.cdt ? JSON.stringify(chapterContent.cdt, null, 2) : "None"}

---
Analysis Requirements:
- Listen to the audio to determine the exact total duration
- Generate between ${IMAGE_PROMPT_MIN_COUNT} and ${IMAGE_PROMPT_MAX_COUNT} image prompts per minute of audio, distributed across the full duration
- CRITICAL TIMING: Each image timestamp MUST be set to the EXACT moment in the audio when the narrator begins speaking the phrase that introduces that scene — the image must appear precisely when that sentence starts being spoken, not before, not after
- CRITICAL DURATION: Each image duration MUST cover the narration segment for that scene — from when the phrase starts until the next image's phrase begins (or the audio ends); do NOT use fixed durations, derive them from the actual audio phrasing
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
- Calcular los timestamps PRECISOS de cada imagen al nivel de la frase
- Percibir el ritmo narrativo, pausas, y momentos de tensión emocional

El contenido textual (escenas, TTS, estado de la historia) es únicamente REFERENCIA de contexto visual y narrativo. Los tiempos deben derivarse del audio, no del texto.

---

## 🎯 SINCRONIZACIÓN PRECISA FRASE-IMAGEN

Este es el requisito más crítico del sistema. Las imágenes aparecen en el video final sincronizadas con el audio, por lo que una mala sincronización arruina la experiencia.

### **Regla de oro de sincronización**:
- Escucha el audio y localiza el momento exacto en que el narrador COMIENZA A PRONUNCIAR la frase o segmento narrativo que corresponde a cada escena visual
- El **timestamp** de cada imagen debe ser el instante preciso en que esa frase comienza — ni un segundo antes (la imagen no debe aparecer antes de que se mencione), ni un segundo después (el espectador ya escuchó la frase sin ver la imagen)
- La **duración** de cada imagen debe extenderse desde el inicio de esa frase hasta el inicio de la siguiente imagen — cubre exactamente el segmento de audio que describe esa escena; NO uses duraciones fijas o arbitrarias

### **Proceso de análisis**:
1. Escucha el audio completo para entender el flujo narrativo total
2. Identifica los segmentos de frases clave que marcan transiciones visuales
3. Registra el timestamp EXACTO de inicio de cada frase clave (en MM:SS)
4. Calcula la duración de cada imagen como: timestamp_siguiente_imagen - timestamp_imagen_actual
5. Para la última imagen, usa el tiempo restante hasta el final del audio

---

## 🎯 GENERACIÓN DE PROMPTS

Debes generar ${IMAGE_PROMPT_MIN_COUNT}-${IMAGE_PROMPT_MAX_COUNT} prompts de imagen por minuto de audio con las siguientes características:

### **Cantidad exacta**: Entre ${IMAGE_PROMPT_MIN_COUNT} y ${IMAGE_PROMPT_MAX_COUNT} prompts por minuto de audio
### **Distribución temporal**:
- Escuchar el audio para determinar la duración real total
- Distribuir prompts a lo largo del capítulo de manera secuencial, evitando concentrarlos solo al inicio
- Cada timestamp debe coincidir con el inicio de la frase correspondiente en el audio

### **Contenido de cada prompt**:
- **Descripción visual clara**: Personajes, acciones, entorno, iluminación
- **Estilo cinematográfico**: Encuadre, ángulo, composición
- **Estilo fijo ANCLADO**: Incluir obligatoriamente el estilo base: "${IMAGE_STYLE_ANCHOR}"
- **Detalles específicos**: Elementos que representen el momento clave de la escena

### **Duración por imagen**:
- Derivada del audio: desde el inicio de la frase hasta el inicio de la siguiente
- NO usar valores fijos; respetar la cadencia real del narrador
- La suma de todas las duraciones debe aproximarse a la duración total del audio

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

1. **SINCRONIZACIÓN EXACTA**: El timestamp de cada imagen es el momento en que el narrador EMPIEZA a hablar de esa escena — ni antes, ni después
2. **DURACIÓN DERIVADA DEL AUDIO**: Cada imagen dura desde su frase de inicio hasta la frase de inicio de la siguiente imagen
3. **AUDIO PRIMERO**: Los timestamps deben reflejar lo que ocurre en el audio, no estimaciones de texto
4. **ANCLAR ESTILO**: CADA prompt debe incluir EXACTAMENTE el estilo base completo
5. **NO CARAS**: El estilo especifica "No clear faces" – respetar esta directiva
6. **DISTRIBUCIÓN**: Los prompts deben cubrir todo el capítulo, no concentrarse solo en el inicio
7. **ORIGINALIDAD**: Cada prompt debe describir una escena visual única
8. **CONTEXTUAL**: Los prompts deben ser coherentes con la narrativa analizada

---

## 📤 FORMATO DE SALIDA

Debes responder únicamente con un objeto JSON válido que contenga un array "imagePrompts" con los prompts generados.

Estructura de cada entrada:
- index: número consecutivo (0, 1, 2, ...)
- timestamp: formato MM:SS — momento exacto en que el narrador inicia la frase correspondiente (ej: "00:45", "01:30", "02:15")
- duration: segundos derivados del audio (diferencia entre timestamps consecutivos); NO un valor fijo
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
