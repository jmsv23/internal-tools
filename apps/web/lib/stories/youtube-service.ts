import { getGemini, GEMINI_MODELS } from "@/lib/gemini/client";
import { Type } from "@google/genai";
import type { Story, Chapter } from "./types";

export interface YouTubeCoverOption {
  id: string;
  prompt: string;
  imageUrl?: string;
}

export interface YouTubeTitle {
  title: string;
  catchPhrase: string;
  emojis: string;
}

export interface YouTubeDescription {
  title: string;
  synopsis: string;
  question: string;
  fullText: string;
}

export interface YouTubePublishingContent {
  covers: YouTubeCoverOption[];
  titles: YouTubeTitle[];
  fullStoryDescription: YouTubeDescription;
  chapterDescriptions: YouTubeDescription[];
}

function generateCatchPhrase(): string {
  const catchPhrases: string[] = [
    "ESTO TE CAMBIARÁ TODO",
    "NO PODRÁS DEJAR DE MIRAR",
    "EL FUTURO ESTÁ AQUÍ",
    "PREPÁRATE PARA LO INCREÍBLE",
    "ESTO ES LO QUE NO TE CUENTAN",
    "LA VERDAD QUE DEBES SABER",
    "ALGO NUNCA VISTO ANTES",
    "ESTO ES LO QUE VIENE",
    "DESCUBRE LO IMPOSIBLE",
    "EL MUNDO ESTÁ A PUNTO DE CAMBIAR",
  ];
  return catchPhrases[Math.floor(Math.random() * catchPhrases.length)] || "PREPÁRATE PARA LO INCREÍBLE";
}

function generateEmojis(): string {
  const emojiSets: string[] = [
    "🚀🔥",
    "🎭⚡",
    "🌟💫",
    "🔮✨",
    "💥🎬",
    "🤖🌐",
    "🎪🎯",
    "⚡🎪",
    "🔥🎭",
    "✨🚀",
  ];
  return emojiSets[Math.floor(Math.random() * emojiSets.length)] || "🚀🔥";
}

function generateCoverPrompt(storyIdea: string, storyTitle: string): string {
  return `Create a striking, cinematic YouTube thumbnail for a dystopian sci-fi story titled "${storyTitle}". The story is about: ${storyIdea}. Make it eye-catching, dramatic, with high contrast, using a futuristic aesthetic. Include subtle technological elements and a sense of mystery. Style: professional, high-quality, cinematic lighting.`;
}

function generateDescriptionTemplate(
  synopsis: string,
  question: string
): string {
  return `Bienvenidos a Neo-relatos. 

${synopsis}

Lo que encontrarás en Neo-relatos:
Historias distópicas, crónicas del futuro cercano y relatos que te harán cuestionar hacia dónde nos lleva la tecnología.


💬 QUEREMOS SABER TU OPINIÓN:
${question}

🔔 SUSCRÍBETE A NEO-RELATOS para no perderte más historias que desafían el futuro.`;
}

const TITLES_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    titles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          catchPhrase: { type: Type.STRING },
          emojis: { type: Type.STRING },
        },
        required: ["title", "catchPhrase", "emojis"],
      },
    },
  },
  required: ["titles"],
};

async function generateTitles(story: Story): Promise<YouTubeTitle[]> {
  const prompt = `Generate 3 catchy, clickbait-style YouTube titles in Spanish for a dystopian sci-fi story.

Story Title: ${story.title}
Story Idea: ${story.idea}

Requirements:
1. Follow this format: [CATCH PHRASE] [emojis] | [TITLE]
2. Make them dramatic and attention-grabbing
3. Use 2-3 emojis per title
4. Focus on the most exciting elements of the story
5. Keep titles under 60 characters total
6. Make them slightly clickbaity but still relevant`;

  const response = await getGemini().models.generateContent({
    model: GEMINI_MODELS.flash,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: TITLES_SCHEMA,
    },
  });

  try {
    const result = JSON.parse(response.text?.trim() || "{}");
    return result.titles || [
      {
        title: story.title,
        catchPhrase: generateCatchPhrase(),
        emojis: generateEmojis(),
      },
    ];
  } catch {
    return [
      {
        title: story.title,
        catchPhrase: generateCatchPhrase(),
        emojis: generateEmojis(),
      },
    ];
  }
}

async function generateChapterSynopsis(chapter: any, storyTitle: string): Promise<string> {
  const prompt = `Generate a compelling 1-2 sentence synopsis for a chapter of a dystopian sci-fi story called "${storyTitle}".

Chapter ${chapter.chapterNumber}: ${chapter.title}
Context: ${chapter.context}
Conflict: ${chapter.conflict}
Climax: ${chapter.climax}

Write the synopsis in Spanish, making it dramatic and engaging.`;

  const response = await getGemini().models.generateContent({
    model: GEMINI_MODELS.flash,
    contents: prompt,
  });

  return response.text?.trim() || chapter.title;
}

async function generateInteractionQuestion(story: Story, chapter?: Chapter): Promise<string> {
  const topic = chapter
    ? `Chapter ${chapter.chapterNumber}: ${chapter.title}`
    : story.title;

  const prompt = `Generate an engaging question in Spanish to promote video interaction (comments) for a YouTube video about a dystopian sci-fi story.

Topic: ${topic}
Story: ${story.idea}

The question should be thought-provoking and encourage viewers to share their opinions.`;

  const response = await getGemini().models.generateContent({
    model: GEMINI_MODELS.flash,
    contents: prompt,
  });

  return response.text?.trim() || "¿Qué opinas de esta historia?";
}

export async function generateYouTubePublishingContent({
  story,
}: {
  story: any;
}): Promise<{ success: boolean; content?: YouTubePublishingContent; error?: string }> {
  try {
    const [titles, chapterDescriptions, fullStoryDescription] = await Promise.all([
      generateTitles(story),
      Promise.all(
        story.chapters.map(async (chapter: any) => {
          const synopsis = await generateChapterSynopsis(chapter, story.title);
          const question = await generateInteractionQuestion(story, chapter);

          return {
            title: `${story.title} - Capítulo ${chapter.chapterNumber}: ${chapter.title}`,
            synopsis,
            question,
            fullText: generateDescriptionTemplate(synopsis, question),
          };
        })
      ),
      (async () => {
        const synopsis = story.idea;
        const question = await generateInteractionQuestion(story);
        return {
          title: story.title,
          synopsis,
          question,
          fullText: generateDescriptionTemplate(synopsis, question),
        };
      })(),
    ]);

    const covers: YouTubeCoverOption[] = [
      {
        id: "cover-a",
        prompt: generateCoverPrompt(story.idea, story.title),
      },
      {
        id: "cover-b",
        prompt: generateCoverPrompt(story.idea, story.title),
      },
    ];

    const content: YouTubePublishingContent = {
      covers,
      titles,
      fullStoryDescription,
      chapterDescriptions,
    };

    return { success: true, content };
  } catch (error) {
    console.error("Error generating YouTube content:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
