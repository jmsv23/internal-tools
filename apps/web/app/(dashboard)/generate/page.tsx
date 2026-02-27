"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GEMINI_VOICES, DEFAULT_GEMINI_VOICE_ID, type GeminiVoiceId } from "@/lib/gemini/voices";

interface AudioFormData {
  title: string;
  content: string;
  voiceId: GeminiVoiceId;
}

export default function GenerateAudioPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<AudioFormData>({
    title: "",
    content: "",
    voiceId: DEFAULT_GEMINI_VOICE_ID,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
    if (error) setError(null);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, content: e.target.value }));
    if (error) setError(null);
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, voiceId: e.target.value as GeminiVoiceId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError("Please enter a title for your audio");
      return;
    }

    if (!formData.content.trim()) {
      setError("Please enter some text to generate audio");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate audio");
      }

      // Redirect to audio list page
      router.push("/audios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Generate Audio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <input
                id="title"
                type="text"
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                placeholder="Enter a title to identify this audio..."
                value={formData.title}
                onChange={handleTitleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Text Content</Label>
              <textarea
                id="content"
                className="w-full min-h-[200px] px-3 py-2 border border-input bg-background rounded-md text-sm"
                placeholder="Enter the text you want to convert to audio..."
                value={formData.content}
                onChange={handleContentChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice">Voice</Label>
              <select
                id="voice"
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                value={formData.voiceId}
                onChange={handleVoiceChange}
                disabled={isSubmitting}
              >
                {GEMINI_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Generating..." : "Generate Audio"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}