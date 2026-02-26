export type AudioLanguage = "english" | "spanish";

export interface Audio {
  id: string;
  userId: string;
  language: AudioLanguage;
  content: string | null;
  audioUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
