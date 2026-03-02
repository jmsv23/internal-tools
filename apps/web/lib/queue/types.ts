export interface ChapterPipelineJobData {
  storyId: string;
  chapterId: string;
  userId: string;
}

export interface StepResult {
  success: boolean;
  error?: string;
}

export interface ChapterPipelineJobResult {
  step2: StepResult;
  step3: StepResult;
  step4: StepResult;
  step5: StepResult;
  step6: StepResult;
  failedAt?: number;
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  failedAt?: number;
  error?: string;
  chapterId: string;
  storyId: string;
}

export type { Job, Queue, Worker, JobsOptions } from 'bullmq';