import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit2, Save, X, Plus, Trash2 } from "lucide-react";

interface ImagePrompt {
  index: number;
  timestamp: string;
  duration: number;
  prompt: string;
}

interface ImagePromptsEditorProps {
  prompts: string | null;
  editable?: boolean;
  onSave?: (prompts: ImagePrompt[]) => void;
}

export default function ImagePromptsEditor({ 
  prompts, 
  editable = false, 
  onSave 
}: ImagePromptsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [imagePrompts, setImagePrompts] = useState<ImagePrompt[]>([]);

  useEffect(() => {
    if (prompts) {
      try {
        const parsed = JSON.parse(prompts);
        setImagePrompts(parsed.imagePrompts || []);
      } catch {
        setImagePrompts([]);
      }
    }
  }, [prompts]);

  const handleSave = () => {
    if (onSave) {
      onSave(imagePrompts);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (prompts) {
      try {
        const parsed = JSON.parse(prompts);
        setImagePrompts(parsed.imagePrompts || []);
      } catch {
        setImagePrompts([]);
      }
    }
    setIsEditing(false);
  };

  const updatePrompt = (index: number, field: keyof ImagePrompt, value: string | number) => {
    setImagePrompts(prev => 
      prev.map(prompt => 
        prompt.index === index ? { ...prompt, [field]: value } : prompt
      )
    );
  };

  const addPrompt = () => {
    const newIndex = imagePrompts.length > 0 ? Math.max(...imagePrompts.map(p => p.index)) + 1 : 0;
    setImagePrompts(prev => [
      ...prev,
      {
        index: newIndex,
        timestamp: "00:00",
        duration: 5,
        prompt: ""
      }
    ]);
  };

  const removePrompt = (index: number) => {
    setImagePrompts(prev => prev.filter(prompt => prompt.index !== index));
  };

  if (!prompts) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">No image prompts available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Image Prompts</CardTitle>
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
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Image Prompts</Label>
              <Button size="sm" variant="outline" onClick={addPrompt}>
                <Plus className="h-3 w-3 mr-1" />
                Add Prompt
              </Button>
            </div>
            
            {imagePrompts.map((prompt) => (
              <div key={prompt.index} className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <Label className="text-sm font-medium">Prompt #{prompt.index}</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePrompt(prompt.index)}
                    disabled={imagePrompts.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Timestamp</Label>
                    <input
                      type="text"
                      value={prompt.timestamp}
                      onChange={(e) => updatePrompt(prompt.index, "timestamp", e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                      placeholder="MM:SS"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Duration (s)</Label>
                    <input
                      type="number"
                      value={prompt.duration}
                      onChange={(e) => updatePrompt(prompt.index, "duration", parseInt(e.target.value) || 5)}
                      className="w-full px-2 py-1 text-sm border rounded"
                      min="1"
                      max="30"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Index</Label>
                    <input
                      type="number"
                      value={prompt.index}
                      onChange={(e) => updatePrompt(prompt.index, "index", parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border rounded"
                      min="0"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Prompt</Label>
                  <Textarea
                    value={prompt.prompt}
                    onChange={(e) => updatePrompt(prompt.index, "prompt", e.target.value)}
                    className="text-sm"
                    rows={2}
                    placeholder="Enter image prompt..."
                  />
                </div>
              </div>
            ))}
            
            <div className="flex gap-2 pt-2">
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
          <div className="space-y-2">
            {imagePrompts.map((prompt) => (
              <div key={prompt.index} className="bg-muted p-3 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-medium">Prompt #{prompt.index}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {prompt.timestamp} ({prompt.duration}s)
                    </span>
                  </div>
                </div>
                <p className="text-xs">{prompt.prompt}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}