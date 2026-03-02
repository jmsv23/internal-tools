import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Story {
  id: string;
  title: string;
  createdAt: Date;
  chapters: any[];
}

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  const chapterCount = story.chapters?.length || 0;
  
  // Calculate overall progress based on chapter statuses
  const calculateProgress = () => {
    if (!story.chapters || story.chapters.length === 0) return 0;
    
    let totalSteps = 0;
    let completedSteps = 0;
    
    story.chapters.forEach((chapter: any) => {
      // Each chapter has 5 steps: content, audio, imagePrompts, images, video
      totalSteps += 5;
      
      if (chapter.contentStatus === "ready") completedSteps++;
      if (chapter.audioStatus === "ready") completedSteps++;
      if (chapter.imagePromptsStatus === "ready") completedSteps++;
      if (chapter.imagesStatus === "ready") completedSteps++;
      if (chapter.videoStatus === "ready") completedSteps++;
    });
    
    return totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  };
  
  const progress = calculateProgress();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg truncate">
          {story.title || "Untitled Story"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Chapters</p>
            <p className="text-sm">{chapterCount}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">
              {story.createdAt.toLocaleDateString()}
            </p>
          </div>
          
          <div className="pt-2">
            <Link href={`/stories/${story.id}`}>
              <Button className="w-full" size="sm">
                View Story
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}