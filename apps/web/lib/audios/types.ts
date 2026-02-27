export type AudioLanguage = "english" | "spanish";

export interface Audio {
  id: string;
  userId: string;
  title: string | null;
  language: AudioLanguage;
  content: string | null;
  audioUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
