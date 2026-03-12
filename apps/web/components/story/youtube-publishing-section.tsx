"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Copy, Download, Sparkles } from "lucide-react";

interface YouTubeCoverOption {
  id: string;
  prompt: string;
  imageUrl?: string;
}

interface YouTubeTitle {
  title: string;
  catchPhrase: string;
  emojis: string;
}

interface YouTubeDescription {
  title: string;
  synopsis: string;
  question: string;
  fullText: string;
}

interface YouTubePublishingContent {
  covers: YouTubeCoverOption[];
  titles: YouTubeTitle[];
  fullStoryDescription: YouTubeDescription;
  chapterDescriptions: YouTubeDescription[];
}

interface YouTubePublishingSectionProps {
  storyId: string;
  storyTitle: string;
}

export default function YouTubePublishingSection({
  storyId,
  storyTitle,
}: YouTubePublishingSectionProps) {
  const [content, setContent] = useState<YouTubePublishingContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPrompts, setEditingPrompts] = useState<{ [key: string]: string }>({});
  const [selectedTitle, setSelectedTitle] = useState<number>(0);
  const [selectedCover, setSelectedCover] = useState<string>("cover-a");

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/stories/${storyId}/generate-youtube-content`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate YouTube content");
      }

      const data = await response.json();
      setContent(data.content);

      const initialPrompts: { [key: string]: string } = {};
      data.content.covers.forEach((cover: YouTubeCoverOption) => {
        initialPrompts[cover.id] = cover.prompt;
      });
      setEditingPrompts(initialPrompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoverImage = async (coverId: string) => {
    const prompt = editingPrompts[coverId];
    setError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/generate-youtube-cover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coverId, prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate cover image");
      }

      const data = await response.json();
      setContent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          covers: prev.covers.map((cover) =>
            cover.id === coverId ? { ...cover, imageUrl: data.imageUrl } : cover
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate cover image");
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = filename;
    link.click();
  };

  if (!content) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            YouTube Publishing Kit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate titles, descriptions, and cover images optimized for YouTube growth and engagement.
          </p>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? "Generating..." : "Generate YouTube Content"}
          </Button>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            YouTube Publishing Kit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={loading} variant="outline">
            {loading ? "Regenerating..." : "Regenerate Content"}
          </Button>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📸 Cover Images (A/B Testing)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {content.covers.map((cover, index) => (
            <div key={cover.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id={cover.id}
                  name="cover-selection"
                  checked={selectedCover === cover.id}
                  onChange={() => setSelectedCover(cover.id)}
                  className="w-4 h-4"
                />
                <Label htmlFor={cover.id} className="font-medium">
                  Option {index === 0 ? "A" : "B"}
                </Label>
              </div>

              <div>
                <Label htmlFor={`prompt-${cover.id}`}>Image Prompt</Label>
                <Textarea
                  id={`prompt-${cover.id}`}
                  value={editingPrompts[cover.id] || ""}
                  onChange={(e) =>
                    setEditingPrompts((prev) => ({ ...prev, [cover.id]: e.target.value }))
                  }
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Button
                onClick={() => handleGenerateCoverImage(cover.id)}
                disabled={!editingPrompts[cover.id]}
                variant="outline"
                size="sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Image
              </Button>

              {cover.imageUrl && (
                <div className="space-y-2">
                  <img
                    src={cover.imageUrl}
                    alt={`Cover option ${index + 1}`}
                    className="w-full max-w-md rounded-lg border"
                  />
                  <Button
                    onClick={() => handleDownloadImage(cover.imageUrl!, `${storyTitle}-cover-${index + 1}.png`)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🎬 Title Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {content.titles.map((titleOption, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id={`title-${index}`}
                  name="title-selection"
                  checked={selectedTitle === index}
                  onChange={() => setSelectedTitle(index)}
                  className="w-4 h-4"
                />
                <Label htmlFor={`title-${index}`} className="font-medium cursor-pointer">
                  {titleOption.catchPhrase} {titleOption.emojis} | {titleOption.title}
                </Label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Full Story Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content.fullStoryDescription.fullText}
            readOnly
            rows={12}
            className="font-mono text-sm"
          />
          <Button
            onClick={() => handleCopyToClipboard(content.fullStoryDescription.fullText)}
            variant="outline"
            size="sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📚 Chapter Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {content.chapterDescriptions.map((chapterDesc, index) => (
            <div key={index} className="space-y-3 p-4 border rounded-lg">
              <h3 className="font-semibold">{chapterDesc.title}</h3>
              <Textarea
                value={chapterDesc.fullText}
                readOnly
                rows={10}
                className="font-mono text-sm"
              />
              <Button
                onClick={() => handleCopyToClipboard(chapterDesc.fullText)}
                variant="outline"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>✅ Ready to Publish</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Selected Title:</strong> {content.titles[selectedTitle]?.catchPhrase}{" "}
              {content.titles[selectedTitle]?.emojis} | {content.titles[selectedTitle]?.title}
            </p>
            <p className="text-sm">
              <strong>Selected Cover:</strong> Option {selectedCover === "cover-a" ? "A" : "B"}
            </p>
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            Use the generated content above for each video. The chapter descriptions are optimized for
            individual chapter uploads, while the full story description works for complete story videos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
