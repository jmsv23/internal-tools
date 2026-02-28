"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import imageStyles from "@/lib/image-generation/image-styles.json";

interface ImageStyle {
  name: string;
  description: string;
  prompt: string;
}

interface ImageGenerationFormProps {
  onImageGenerated?: (imageUrl: string, metadata: any) => void;
}

export default function ImageGenerationForm({
  onImageGenerated,
}: ImageGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [styleName, setStyleName] = useState<string>("none");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState("1024*1024");
  const [seed, setSeed] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<{
    url: string;
    metadata: any;
  } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const requestBody: any = {
        prompt,
      };

      if (styleName && styleName !== "none") {
        requestBody.styleName = styleName;
      }

      if (negativePrompt.trim()) {
        requestBody.negativePrompt = negativePrompt.trim();
      }

      if (size !== "1024*1024") {
        requestBody.size = size;
      }

      if (seed.trim() && !isNaN(parseInt(seed))) {
        requestBody.seed = parseInt(seed);
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      setGeneratedImage({
        url: data.imageUrl,
        metadata: {
          id: data.id,
          cost: data.cost,
          generationTime: data.generationTime,
        },
      });

      if (onImageGenerated) {
        onImageGenerated(data.imageUrl, data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      // Then download the image
      const response = await fetch(generatedImage.url);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Failed to download image");
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Image Generation</CardTitle>
        <CardDescription>
          Generate images using AI with custom prompts and styles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style (Optional)</Label>
            <Select value={styleName} onValueChange={setStyleName}>
              <SelectTrigger>
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Use prompt as is)</SelectItem>
                {(imageStyles as ImageStyle[]).map((style) => (
                  <SelectItem key={style.name} value={style.name}>
                    {style.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {styleName && styleName !== "none" && (
              <p className="text-sm text-muted-foreground">
                {
                  (imageStyles as ImageStyle[]).find(
                    (s) => s.name === styleName
                  )?.description
                }
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024*1024">1024×1024 (Square)</SelectItem>
                  <SelectItem value="1024*768">1024×768 (Landscape)</SelectItem>
                  <SelectItem value="768*1024">768×1024 (Portrait)</SelectItem>
                  <SelectItem value="1280*720">1280×720 (HD)</SelectItem>
                  <SelectItem value="1920*1080">1920×1080 (Full HD)</SelectItem>
                  <SelectItem value="2048*2048">2048×2048 (High Res)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seed">Seed (Optional)</Label>
              <Input
                id="seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Random"
                min="-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
            <Textarea
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Describe what you don't want in the image..."
              rows={2}
            />
          </div>

          <Button type="submit" disabled={isLoading || !prompt.trim()}>
            {isLoading ? "Generating..." : "Generate Image"}
          </Button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        {generatedImage && (
          <div className="mt-6 space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <img
                src={generatedImage.url}
                alt="Generated image"
                className="w-full h-auto"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline">
                Download Image
              </Button>
              <Button
                onClick={() => {
                  setGeneratedImage(null);
                  setPrompt("");
                  setNegativePrompt("");
                  setSeed("");
                  setStyleName("none");
                }}
                variant="outline"
              >
                Generate Another
              </Button>
            </div>
            {generatedImage.metadata && (
              <div className="text-sm text-muted-foreground space-y-1">
                {generatedImage.metadata.cost && (
                  <p>Cost: ${generatedImage.metadata.cost.toFixed(4)}</p>
                )}
                {generatedImage.metadata.generationTime && (
                  <p>
                    Generation time:{" "}
                    {(generatedImage.metadata.generationTime / 1000).toFixed(2)}s
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}