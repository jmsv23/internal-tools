import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@repo/db";

interface RouteParams {
  params: {
    storyId: string;
  };
}

function calcProgress(chapters: { contentStatus: string; audioStatus: string; imagePromptsStatus: string; imagesStatus: string; videoStatus: string }[]) {
  const totalSteps = chapters.length * 5;
  const completedSteps = chapters.reduce((acc, chapter) => {
    let steps = 0;
    if (chapter.contentStatus === "ready") steps++;
    if (chapter.audioStatus === "ready") steps++;
    if (chapter.imagePromptsStatus === "ready") steps++;
    if (chapter.imagesStatus === "ready") steps++;
    if (chapter.videoStatus === "ready") steps++;
    return acc + steps;
  }, 0);
  return { totalSteps, completedSteps };
}

async function fetchStory(storyId: string, userId: string) {
  const story = await db.story.findFirst({
    where: { id: storyId, userId },
    include: {
      chapters: {
        include: { images: true },
        orderBy: { chapterNumber: "asc" },
      },
    },
  });

  if (!story) return null;

  const { totalSteps, completedSteps } = calcProgress(story.chapters);

  return {
    ...story,
    chapterCount: story.chapters.length,
    completedSteps,
    totalSteps,
    progressPercentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
  };
}

function hasProcessingChapters(chapters: { contentStatus: string; audioStatus: string; imagePromptsStatus: string; imagesStatus: string; videoStatus: string }[]) {
  return chapters.some(
    (c) =>
      c.contentStatus === "processing" ||
      c.audioStatus === "processing" ||
      c.imagePromptsStatus === "processing" ||
      c.imagesStatus === "processing" ||
      c.videoStatus === "processing"
  );
}

function stateKey(story: NonNullable<Awaited<ReturnType<typeof fetchStory>>>) {
  return story.chapters
    .map((c) => `${c.id}:${c.contentStatus}:${c.audioStatus}:${c.imagePromptsStatus}:${c.imagesStatus}:${c.videoStatus}:${c.updatedAt}`)
    .join("|");
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { storyId } = await params;

  // 2. Verify story ownership
  const initial = await fetchStory(storyId, session.user.id);
  if (!initial) {
    return new Response("Story not found", { status: 404 });
  }

  const userId = session.user.id;

  // 3. Build SSE stream
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastKey = stateKey(initial);

  const stream = new ReadableStream({
    start(controller) {
      const encode = (data: object) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(payload));
      };

      // Send initial state immediately
      encode({ type: "story-update", story: initial });

      // Poll DB every 2 seconds
      intervalId = setInterval(async () => {
        try {
          const story = await fetchStory(storyId, userId);
          if (!story) {
            encode({ type: "error", message: "Story not found" });
            clearInterval(intervalId!);
            controller.close();
            return;
          }

          const key = stateKey(story);
          if (key !== lastKey) {
            lastKey = key;
            encode({ type: "story-update", story });
          }

          if (!hasProcessingChapters(story.chapters)) {
            encode({ type: "complete" });
            clearInterval(intervalId!);
            controller.close();
          }
        } catch {
          // Ignore transient DB errors; keep polling
        }
      }, 2000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
