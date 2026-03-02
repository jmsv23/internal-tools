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
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/stories/${storyId}`);
      // if (response.ok) {
      //   const data = await response.json();
      //   setStory(data);
      //   
      //   // Manage polling based on processing status
      //   if (shouldPoll(data)) {
      //     if (!pollingInterval) startPolling();
      //   } else {
      //     stopPolling();
      //   }
      // } else {
      //   setError("Failed to load story");
      // }
      
      // For now, use mock data
      const mockStory = {
        id: storyId,
        title: "Mock Story",
        idea: "This is a mock story for testing",
        status: "ready",
        createdAt: new Date(),
        updatedAt: new Date(),
        chapters: [
          {
            id: "chapter-1",
            chapterNumber: 1,
            title: "Chapter 1",
            context: "Once upon a time...",
            conflict: "A great challenge",
            visualDescription: "Beautiful landscape",
            climax: "The hero triumphs",
            contentStatus: "ready",
            audioStatus: "ready",
            imagePromptsStatus: "ready",
            imagesStatus: "ready",
            videoStatus: "pending",
            ttsContent: "Este es el contenido del capítulo 1 en español...",
            cdtContent: JSON.stringify([{name: "Leo", description: "Un joven valiente"}]),
            storyState: JSON.stringify({
              worldState: ["Reino en paz"],
              characterState: [{name: "Leo", emotionalState: "Valiente", internalShift: "Decide actuar"}],
              lastEvent: "Leo descubre el problema",
              openThreads: ["¿Podrá Leo superar el desafío?"]
            }),
            imagePrompts: JSON.stringify({
              imagePrompts: [
                {index: 0, timestamp: "00:00", duration: 5, prompt: "Landscape shot..."},
                {index: 1, timestamp: "00:05", duration: 5, prompt: "Character intro..."}
              ]
            }),
            audioUrl: "https://example.com/audio.mp3",
            images: [
              {id: "img-1", imageNumber: 0, prompt: "Landscape shot...", timestamp: "00:00", duration: 5, status: "ready", imageUrl: "https://example.com/image1.jpg"},
              {id: "img-2", imageNumber: 1, prompt: "Character intro...", timestamp: "00:05", duration: 5, status: "ready", imageUrl: "https://example.com/image2.jpg"}
            ]
          },
          {
            id: "chapter-2", 
            chapterNumber: 2,
            title: "Chapter 2",
            context: "The adventure continues...",
            conflict: "New obstacles",
            visualDescription: "Dark forest",
            climax: "Revelation",
            contentStatus: "pending",
            audioStatus: "pending",
            imagePromptsStatus: "pending",
            imagesStatus: "pending", 
            videoStatus: "pending",
            images: []
          }
        ]
      };
      
      setStory(mockStory);
      
      // Manage polling based on processing status
      if (shouldPoll(mockStory)) {
        if (!pollingInterval) startPolling();
      } else {
        stopPolling();
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
    // TODO: Implement step generation API calls
    console.log(`Generating ${step} for chapter ${chapterId}`);
    // After successful generation, refetch story
    fetchStory();
  };

  const handleRunFullPipeline = async (chapterId: string) => {
    // TODO: Implement full pipeline API call
    console.log(`Running full pipeline for chapter ${chapterId}`);
    // After successful completion, refetch story
    fetchStory();
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
            <p className="text-muted-foreground">Created: {story.createdAt.toLocaleDateString()}</p>
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
            isExpanded={expandedChapters[chapter.id]}
            onToggle={() => toggleChapter(chapter.id)}
          >
            <div className="p-4">
              <PipelineStepper
                chapter={chapter}
                onGenerateStep={(step) => handleGenerateStep(chapter.id, step)}
                onRunFullPipeline={() => handleRunFullPipeline(chapter.id)}
              />
            </div>
          </ChapterAccordion>
        ))}
      </div>
    </div>
  );
}