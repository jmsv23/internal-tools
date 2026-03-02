import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

interface ChapterAccordionProps {
  chapter: Chapter;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function ChapterAccordion({ 
  chapter, 
  isExpanded, 
  onToggle, 
  children 
}: ChapterAccordionProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "text-green-600";
      case "processing": return "text-yellow-600"; 
      case "failed": return "text-red-600";
      default: return "text-gray-500";
    }
  };

  const ChapterInfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="py-2 border-b border-border last:border-b-0">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm mt-1">{value}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            <div>
              <CardTitle className="text-lg">
                Chapter {chapter.chapterNumber}: {chapter.title}
              </CardTitle>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full bg-muted ${getStatusColor(chapter.contentStatus)}`}>
                  Content: {chapter.contentStatus}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full bg-muted ${getStatusColor(chapter.audioStatus)}`}>
                  Audio: {chapter.audioStatus}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full bg-muted ${getStatusColor(chapter.imagesStatus)}`}>
                  Images: {chapter.imagesStatus}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full bg-muted ${getStatusColor(chapter.videoStatus)}`}>
                  Video: {chapter.videoStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chapter Seed Info</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-0">
                  <ChapterInfoRow label="Context" value={chapter.context} />
                  <ChapterInfoRow label="Conflict" value={chapter.conflict} />
                  <ChapterInfoRow label="Visual Description" value={chapter.visualDescription} />
                  <ChapterInfoRow label="Climax" value={chapter.climax} />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {children}
        </CardContent>
      )}
    </Card>
  );
}