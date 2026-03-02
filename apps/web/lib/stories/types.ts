export interface ChapterSeed {
  title: string;
  context: string;
  conflict: string;
  visualDescription: string;
  climax: string;
}

export interface CDT {
  name: string;
  description: string;
}

export interface Scene {
  number: number;
  narrative: string;
}

export interface CharacterState {
  name: string;
  emotionalState: string;
  internalShift: string;
}

export interface StoryState {
  worldState: string[];
  characterState: CharacterState[];
  lastEvent: string;
  openThreads: string[];
}

export interface ChapterContent {
  cdt?: CDT[];
  scenes: Scene[];
  ttsContent: string;
  storyState: StoryState;
}

export interface ImagePromptEntry {
  index: number;
  timestamp: string;
  duration: number;
  prompt: string;
}

export interface ImagePrompts {
  imagePrompts: ImagePromptEntry[];
}

export interface SlideshowConfig {
  resolution: string;
  fps: number;
  quality: string;
  hardware_accel: string;
  background_audio: {
    file: string;
    volume: number;
    loop: boolean;
    fade_in: number;
    fade_out: number;
  };
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  image: string;
  duration: number;
  transition?: {
    type: string;
    duration: number;
  };
}

export type PipelineStatus = "pending" | "processing" | "ready" | "failed";

export interface Chapter {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  context: string;
  conflict: string;
  visualDescription: string;
  climax: string;
  fullContent?: string;
  ttsContent?: string;
  cdtContent?: string;
  storyState?: string;
  contentStatus: PipelineStatus;
  audioUrl?: string;
  audioStatus: PipelineStatus;
  imagePrompts?: string;
  imagePromptsStatus: PipelineStatus;
  imagesStatus: PipelineStatus;
  videoConfigUrl?: string;
  videoStatus: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Story {
  id: string;
  userId: string;
  title: string;
  idea: string;
  chapterSeed?: string;
  status: PipelineStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  chapters: Chapter[];
}

export interface ChapterImage {
  id: string;
  chapterId: string;
  imageNumber: number;
  prompt: string;
  timestamp: string;
  duration?: number;
  imageUrl?: string;
  status: PipelineStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}