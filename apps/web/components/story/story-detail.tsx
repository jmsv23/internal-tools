"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ChapterAccordion from "@/components/story/chapter-accordion";
import PipelineStepper from "@/components/story/pipeline-stepper";
import YouTubePublishingSection from "@/components/story/youtube-publishing-section";

interface Story {
  id: string;
  title: string;
  idea: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  context: string;
  conflict: string;
  visualDescription: string;
  climax: string;
  contentStatus: string;
  audioStatus: string;
  imagePromptsStatus: string;
  imagesStatus: string;
  videoStatus: string;
  ttsContent?: string;
  cdtContent?: string;
  storyState?: string;
  fullContent?: string;
  imagePrompts?: string;
  audioUrl?: string;
  videoConfigUrl?: string;
  images: any[];
}

export default function StoryDetailPage({ story }: { story: any }) {
  const storyId = story.id as string;
  const router = useRouter();

  const [storyState, setStoryState] = useState<Story | null>(story);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<{ [key: string]: boolean }>({});
  const [connectionKey, setConnectionKey] = useState(0);

  useEffect(() => {
    const es = new EventSource(`/api/stories/${storyId}/events`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "story-update") {
        setStoryState(data.story);
      } else if (data.type === "complete") {
        es.close();
      } else if (data.type === "error") {
        setError(data.message ?? "Failed to load story");
        es.close();
      }
    };

    es.onerror = () => {
      // readyState CONNECTING (0) means auto-reconnecting after server closed — not a real error
      // readyState CLOSED (2) means the connection permanently failed
      if (es.readyState === EventSource.CLOSED) {
        setError("Lost connection to story updates");
      }
    };

    return () => {
      es.close();
    };
  }, [storyId, connectionKey]);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const handleGenerateStep = async (
    chapterId: string,
    step: "content" | "audio" | "image-prompts" | "images" | "package"
  ) => {
    try {
      setConnectionKey((k) => k + 1);

      const response = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/generate-${step}`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error(`Failed to generate ${step}`);
      }
      // SSE stream will deliver the update within ~2 seconds
    } catch (err) {
      console.error(`Error generating ${step}:`, err);
    }
  };

  const handleRunFullPipeline = async (chapterId: string) => {
    try {
      setConnectionKey((k) => k + 1);
      const response = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/run-full-pipeline`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error("Failed to run full pipeline");
      }
      // SSE stream will deliver the update within ~2 seconds
    } catch (err) {
      console.error("Error running full pipeline:", err);
    }
  };

  if (error || !storyState) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-4">{error || "Story not found"}</p>
            <Button onClick={() => router.push("/stories")}>Back to Stories</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{storyState.title}</h1>
            <p className="text-muted-foreground">Created: {""}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/stories")}>
            Back to Stories
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Story Idea</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{storyState.idea}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <YouTubePublishingSection storyId={storyId} storyTitle={storyState.title} />
      </div>

      <div className="space-y-4">
        {storyState.chapters.map((chapter) => (
          <ChapterAccordion
            key={chapter.id}
            chapter={chapter}
            isExpanded={!!expandedChapters[chapter.id]}
            onToggle={() => toggleChapter(chapter.id)}
          >
            <div className="p-4">
              <PipelineStepper
                chapter={chapter}
                storyId={storyId}
                onGenerateStep={(step) =>
                  handleGenerateStep(
                    chapter.id,
                    step as "content" | "audio" | "image-prompts" | "images" | "package"
                  )
                }
                onRunFullPipeline={() => handleRunFullPipeline(chapter.id)}
              />
            </div>
          </ChapterAccordion>
        ))}
      </div>
    </div>
  );
}
