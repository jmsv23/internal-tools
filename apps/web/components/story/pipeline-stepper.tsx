import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Loader2,
  FileText,
  Volume2,
  Image,
  Download
} from "lucide-react";
import ChapterContentPreview from "./chapter-content-preview";
import ImagePromptsEditor from "./image-prompts-editor";
import ImageGallery from "./image-gallery";
import ChapterAudioPlayer from "./chapter-audio-player";

interface Chapter {
  id: string;
  chapterNumber: number;
  contentStatus: string;
  audioStatus: string;
  imagePromptsStatus: string;
  imagesStatus: string;
  videoStatus: string;
  ttsContent?: string;
  audioUrl?: string;
  imagePrompts?: string;
  videoConfigUrl?: string;
  fullContent?: string;
  images?: any[];
}

interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: string;
  icon: React.ReactNode;
  prerequisite?: string;
}

interface PipelineStepperProps {
  chapter: Chapter;
  onGenerateStep: (step: string) => void;
  onRunFullPipeline: () => void;
}

export default function PipelineStepper({ 
  chapter, 
  onGenerateStep, 
  onRunFullPipeline 
}: PipelineStepperProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "border-green-600 bg-green-50";
      case "processing":
        return "border-yellow-600 bg-yellow-50";
      case "failed":
        return "border-red-600 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const steps: PipelineStep[] = [
    {
      id: "content",
      name: "Content Generation",
      description: "Generate chapter content and TTS text",
      status: chapter.contentStatus,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "audio",
      name: "Audio Generation",
      description: "Generate narration audio",
      status: chapter.audioStatus,
      icon: <Volume2 className="h-4 w-4" />,
      prerequisite: "ready", // content must be ready
    },
    {
      id: "image-prompts",
      name: "Image Prompts",
      description: "Generate image prompts",
      status: chapter.imagePromptsStatus,
      icon: <FileText className="h-4 w-4" />,
      prerequisite: "ready", // audio must be ready
    },
    {
      id: "images",
      name: "Image Generation",
      description: "Generate chapter images",
      status: chapter.imagesStatus,
      icon: <Image className="h-4 w-4" />,
      prerequisite: "ready", // image prompts must be ready
    },
    {
      id: "package",
      name: "Package Generation",
      description: "Create video package",
      status: chapter.videoStatus,
      icon: <Download className="h-4 w-4" />,
      prerequisite: "ready", // images must be ready
    },
  ];

  const isStepEnabled = (step: PipelineStep) => {
    if (step.status === "ready" || step.status === "processing") {
      return false;
    }
    if (step.prerequisite) {
      const prerequisiteStep = steps.find(s => s.prerequisite === step.id);
      if (prerequisiteStep) {
        return prerequisiteStep.status === "ready";
      }
    }
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Pipeline Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getStatusColor(step.status)}`}>
                  {getStatusIcon(step.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{step.name}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    
                    {isStepEnabled(step) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onGenerateStep(step.id)}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <div className="w-px h-6 bg-border"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={onRunFullPipeline}
              disabled={steps.some(step => step.status === "processing")}
              className="flex-1"
            >
              Run Full Pipeline
            </Button>
            
            <Button 
              variant="outline"
              disabled={chapter.videoStatus !== "ready"}
              className="flex-1"
            >
              Download Package
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            "Run Full Pipeline" executes all remaining steps sequentially
          </p>
        </CardContent>
      </Card>

      {/* Preview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Content Preview */}
        {(chapter.contentStatus === "ready" || chapter.contentStatus === "processing") && (
          <ChapterContentPreview 
            content={chapter.fullContent || null}
            editable={chapter.contentStatus === "ready"}
            onSave={(content) => {
              // TODO: Implement content save API
              console.log("Saving content:", content);
              // This would need to be implemented with a PUT/PATCH endpoint
              // For now, keeping the placeholder as we don't have a content update API yet
            }}
          />
        )}

        {/* Audio Preview */}
        {(chapter.audioStatus === "ready" || chapter.audioStatus === "processing") && (
          <ChapterAudioPlayer 
            audioUrl={chapter.audioUrl}
            title={`Chapter ${chapter.chapterNumber} Audio`}
          />
        )}
      </div>

      {/* Additional Preview Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Image Prompts */}
        {(chapter.imagePromptsStatus === "ready" || chapter.imagePromptsStatus === "processing") && (
          <ImagePromptsEditor 
            prompts={chapter.imagePrompts || null}
            editable={chapter.imagePromptsStatus === "ready"}
            onSave={(prompts) => {
              // TODO: Implement image prompts save API
              console.log("Saving image prompts:", prompts);
              // This would need to be implemented with a PUT/PATCH endpoint
              // For now, keeping the placeholder as we don't have an image prompts update API yet
            }}
          />
        )}

        {/* Image Gallery */}
        {(chapter.imagesStatus === "ready" || chapter.imagesStatus === "processing") && (
          <ImageGallery 
            images={chapter.images || []}
            onDownload={(image) => {
              if (image.imageUrl) {
                // Create a temporary link to download the image
                const link = document.createElement('a');
                link.href = image.imageUrl;
                link.download = `chapter-image-${image.imageNumber || image.id}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}