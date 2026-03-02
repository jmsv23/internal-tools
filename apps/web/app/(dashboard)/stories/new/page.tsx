"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewStoryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    idea: "",
    chapterCount: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const story = await response.json();
        router.push(`/stories/${story.id}`);
      } else {
        const error = await response.json();
        console.error("Failed to create story:", error);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Failed to create story:", error);
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create New Story</h1>
          <p className="text-muted-foreground mt-2">
            Turn your idea into a complete video story with AI-generated content, audio, and images.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Story Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Story Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Enter your story title..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="idea">Story Idea</Label>
                <Textarea
                  id="idea"
                  value={formData.idea}
                  onChange={(e) => handleChange("idea", e.target.value)}
                  placeholder="Describe your story idea, characters, setting, and plot..."
                  className="min-h-[120px]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="chapterCount">Number of Chapters</Label>
                <Input
                  id="chapterCount"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.chapterCount}
                  onChange={(e) => handleChange("chapterCount", parseInt(e.target.value) || 1)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Each chapter will generate content, audio, and images. (1-20 chapters)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !formData.title.trim() || !formData.idea.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? "Creating Story..." : "Create Story"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.push("/stories")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}