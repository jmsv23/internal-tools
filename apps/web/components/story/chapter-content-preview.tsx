import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit2, Save, X } from "lucide-react";

interface ChapterContent {
  scenes?: Array<{
    number: number;
    narrative: string;
  }>;
  cdt?: Array<{
    name: string;
    description: string;
  }>;
  storyState?: {
    worldState: string[];
    characterState: Array<{
      name: string;
      emotionalState: string;
      internalShift: string;
    }>;
    lastEvent: string;
    openThreads: string[];
  };
  ttsContent?: string;
}

interface ChapterContentPreviewProps {
  content: string | null;
  editable?: boolean;
  onSave?: (content: string) => void;
}

export default function ChapterContentPreview({ 
  content, 
  editable = false, 
  onSave 
}: ChapterContentPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content || "");
  const [parsedContent, setParsedContent] = useState<ChapterContent | null>(null);

  useEffect(() => {
    if (content) {
      try {
        const parsed = JSON.parse(content);
        setParsedContent(parsed);
      } catch {
        // If content is not JSON, treat it as plain text
        setParsedContent({ ttsContent: content });
      }
    }
  }, [content]);

  const handleSave = () => {
    if (onSave) {
      onSave(editedContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content || "");
    setIsEditing(false);
  };

  if (!content) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">No content available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Chapter Content</CardTitle>
          {editable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X size={16} /> : <Edit2 size={16} />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <Label htmlFor="tts-content">TTS Content (Editable)</Label>
            <Textarea
              id="tts-content"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[150px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* TTS Content */}
            {parsedContent?.ttsContent && (
              <div>
                <Label className="text-sm font-medium">TTS Content</Label>
                <div className="bg-muted p-3 rounded mt-1">
                  <p className="text-sm whitespace-pre-wrap">{parsedContent.ttsContent}</p>
                </div>
              </div>
            )}

            {/* CDTs (Character Descriptive Templates) */}
            {parsedContent?.cdt && parsedContent.cdt.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Characters</Label>
                <div className="mt-1 space-y-2">
                  {parsedContent.cdt.map((character, index) => (
                    <div key={index} className="bg-muted p-3 rounded">
                      <p className="text-sm font-medium">{character.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{character.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scenes */}
            {parsedContent?.scenes && parsedContent.scenes.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Scenes</Label>
                <div className="mt-1 space-y-2">
                  {parsedContent.scenes.map((scene, index) => (
                    <div key={index} className="bg-muted p-3 rounded">
                      <p className="text-sm font-medium">Scene {scene.number}</p>
                      <p className="text-xs text-muted-foreground mt-1">{scene.narrative}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story State */}
            {parsedContent?.storyState && (
              <div>
                <Label className="text-sm font-medium">Story State</Label>
                <div className="bg-muted p-3 rounded mt-1 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">World State</p>
                    <p className="text-xs">{parsedContent.storyState.worldState.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Last Event</p>
                    <p className="text-xs">{parsedContent.storyState.lastEvent}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Open Threads</p>
                    <p className="text-xs">{parsedContent.storyState.openThreads.join(", ")}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}