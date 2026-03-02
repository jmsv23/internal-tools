"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ChapterAccordion from "@/components/story/chapter-accordion";
import PipelineStepper from "@/components/story/pipeline-stepper";
import ChapterContentPreview from "@/components/story/chapter-content-preview";
import ImagePromptsEditor from "@/components/story/image-prompts-editor";
import ImageGallery from "@/components/story/image-gallery";
import ChapterAudioPlayer from "@/components/story/chapter-audio-player";

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

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;
  
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<{[key: string]: boolean}>({});
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchStory();
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, [storyId]);

  const startPolling = () => {
    stopPolling();
    setPollingInterval(setInterval(fetchStory, 3000)); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const shouldPoll = (story: Story | null) => {
    if (!story) return false;
    return story.chapters.some(chapter => 
      chapter.contentStatus === "processing" ||
      chapter.audioStatus === "processing" ||
      chapter.imagePromptsStatus === "processing" ||
      chapter.imagesStatus === "processing" ||
      chapter.videoStatus === "processing"
    );
  };

  const fetchStory = async () => {
    try {
      if (loading) setLoading(false); // Don't set loading true during polling
      
      const response = await fetch(`/api/stories/${storyId}`);
      if (response.ok) {
        const data = await response.json();
        setStory(data.story);
        
        // Manage polling based on processing status
        if (shouldPoll(data.story)) {
          if (!pollingInterval) startPolling();
        } else {
          stopPolling();
        }
      } else {
        setError("Failed to load story");
      }
    } catch (err) {
      setError("Failed to load story");
    } finally {
      if (loading) setLoading(false);
    }
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handleGenerateStep = async (chapterId: string, step: "content" | "audio" | "image-prompts" | "images" | "package") => {
    try {
      const response = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/generate-${step}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate ${step}`);
      }
      
      // After successful generation, refetch story
      fetchStory();
    } catch (error) {
      console.error(`Error generating ${step}:`, error);
      // You could add error state handling here
    }
  };

  const handleRunFullPipeline = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/stories/${storyId}/chapters/${chapterId}/run-full-pipeline`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to run full pipeline');
      }
      
      // After successful completion, refetch story
      fetchStory();
    } catch (error) {
      console.error('Error running full pipeline:', error);
      // You could add error state handling here
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading story...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-4">{error || "Story not found"}</p>
            <Button onClick={() => router.push("/stories")}>
              Back to Stories
            </Button>
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
            <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
            <p className="text-muted-foreground">Created: {''}</p>
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
            <p className="text-sm">{story.idea}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {story.chapters.map((chapter) => (
          <ChapterAccordion
            key={chapter.id}
            chapter={chapter}
            isExpanded={!!expandedChapters[chapter.id]}
            onToggle={() => toggleChapter(chapter.id)}
          >
            <div className="p-4">
              <PipelineStepper
                chapter={chapter}
                onGenerateStep={(step) => handleGenerateStep(chapter.id, step as "content" | "audio" | "image-prompts" | "images" | "package")}
                onRunFullPipeline={() => handleRunFullPipeline(chapter.id)}
              />
            </div>
          </ChapterAccordion>
        ))}
      </div>
    </div>
  );
}
