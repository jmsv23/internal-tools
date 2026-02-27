"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SYSTEM_PROMPTS } from "@/lib/gemini/system-prompts";

interface ContentFormData {
  systemPromptId: string;
  secondarySystemPrompt: string;
  userPrompt: string;
}

export default function ContentGenerationPage() {
  const [formData, setFormData] = useState<ContentFormData>({
    systemPromptId: "none",
    secondarySystemPrompt: "",
    userPrompt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSystemPromptChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      systemPromptId: value
    }));
    if (error) setError(null);
  };

  const handleSecondarySystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, secondarySystemPrompt: e.target.value }));
    if (error) setError(null);
  };

  const handleUserPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, userPrompt: e.target.value }));
    if (error) setError(null);
  };

  const handleCopyContent = async () => {
    if (!generatedContent) return;
    
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy content:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userPrompt.trim()) {
      setError("Please enter a prompt to generate content");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();
      setGeneratedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Generate Content with Gemini 2.5 Flash</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Select value={formData.systemPromptId || "none"} onValueChange={handleSystemPromptChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a system prompt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default Assistant</SelectItem>
                  {SYSTEM_PROMPTS.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondarySystemPrompt">Secondary System Prompt (Optional)</Label>
              <Textarea
                id="secondarySystemPrompt"
                placeholder="Additional instructions for the AI..."
                value={formData.secondarySystemPrompt}
                onChange={handleSecondarySystemPromptChange}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPrompt">Your Prompt</Label>
              <Textarea
                id="userPrompt"
                placeholder="What would you like the AI to help you with?"
                value={formData.userPrompt}
                onChange={handleUserPromptChange}
                disabled={isSubmitting}
                rows={4}
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Generating..." : "Generate Content"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedContent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Content</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyContent}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {generatedContent}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}