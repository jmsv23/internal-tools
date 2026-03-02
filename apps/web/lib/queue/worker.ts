import { logger } from "@repo/logger";
import { Queue, Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from './config';
import type { ChapterPipelineJobData, ChapterPipelineJobResult } from './types';

// Queue instances
let chapterQueue: Queue | null = null;
let chapterWorker: Worker | null = null;

export function getChapterQueue(): Queue {
  if (!chapterQueue) {
    chapterQueue = new Queue(QUEUE_NAMES.CHAPTER_PIPELINE, {
      connection: getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    
    chapterQueue.on('error', (err) => {
      logger.error('Chapter queue error', { error: err.message });
    });
    
    chapterQueue.on('error', (error: Error) => {
      logger.error('Chapter queue error', { error: error.message });
    });
  }
  
  return chapterQueue;
}

export function getChapterWorker(): Worker {
  if (!chapterWorker) {
    chapterWorker = new Worker(
      QUEUE_NAMES.CHAPTER_PIPELINE,
      processChapterPipelineJob,
      {
        connection: getRedisConnection(),
        concurrency: 3, // Process up to 3 jobs in parallel
        limiter: {
          max: 5,
          duration: 60000, // 5 jobs per minute
        },
      }
    );
    
    chapterWorker.on('error', (err) => {
      logger.error('Chapter worker error', { error: err.message });
    });
    
    chapterWorker.on('completed', (job) => {
      logger.info('Chapter worker completed job', { 
        jobId: job.id, 
        chapterId: job.data.chapterId 
      });
    });
    
    chapterWorker.on('failed', (job, err) => {
      logger.error('Chapter worker failed job', { 
        jobId: job?.id, 
        chapterId: job?.data?.chapterId,
        error: err.message 
      });
    });
    
    chapterWorker.on('drained', () => {
      logger.debug('Chapter worker queue drained');
    });
  }
  
  return chapterWorker;
}

// Import services dynamically to avoid circular dependencies
async function processChapterPipelineJob(job: any): Promise<ChapterPipelineJobResult> {
  const { storyId, chapterId, userId } = job.data as ChapterPipelineJobData;
  
  logger.info('Starting chapter pipeline job', { storyId, chapterId, userId });
  
  try {
    // Dynamic imports to avoid circular dependencies
    const { db } = await import('@repo/db');
    const { generateChapterContentService } = await import('../stories/chapter-content-service');
    const { generateChapterAudioService } = await import('../stories/chapter-audio-service');
    const { generateImagePromptsService } = await import('../stories/image-prompts-service');
    const { generateChapterImagesService } = await import('../stories/images-generation-service');
    const { generateChapterPackageService } = await import('../stories/package-service');
    
    // Verify chapter ownership
    const chapter = await db.chapter.findFirst({
      where: {
        id: chapterId,
        story: {
          id: storyId,
          userId: userId,
        },
      },
    });
    
    if (!chapter) {
      const error = 'Chapter not found or access denied';
      logger.error('Chapter not found in pipeline job', { storyId, chapterId, userId });
      throw new Error(error);
    }
    
    // Step 2: Generate Chapter Content
    const step2: any = await generateChapterContentService({ storyId, chapterId, db });
    logger.info('Step 2 (Content) completed', { 
      storyId, 
      chapterId, 
      success: step2.success,
      error: step2.error 
    });
    
    if (!step2.success) {
      return { 
        step2, 
        step3: { success: false, error: 'Not attempted' },
        step4: { success: false, error: 'Not attempted' },
        step5: { success: false, error: 'Not attempted' },
        step6: { success: false, error: 'Not attempted' },
        failedAt: 2 
      };
    }
    
    // Step 3: Generate Audio
    const step3: any = await generateChapterAudioService({ storyId, chapterId, db });
    logger.info('Step 3 (Audio) completed', { 
      storyId, 
      chapterId, 
      success: step3.success,
      error: step3.error 
    });
    
    if (!step3.success) {
      return { 
        step2, 
        step3,
        step4: { success: false, error: 'Not attempted' },
        step5: { success: false, error: 'Not attempted' },
        step6: { success: false, error: 'Not attempted' },
        failedAt: 3 
      };
    }
    
    // Step 4: Generate Image Prompts
    const step4: any = await generateImagePromptsService({ storyId, chapterId, db });
    logger.info('Step 4 (Image Prompts) completed', { 
      storyId, 
      chapterId, 
      success: step4.success,
      error: step4.error 
    });
    
    if (!step4.success) {
      return { 
        step2, 
        step3,
        step4,
        step5: { success: false, error: 'Not attempted' },
        step6: { success: false, error: 'Not attempted' },
        failedAt: 4 
      };
    }
    
    // Step 5: Generate Images
    const step5: any = await generateChapterImagesService({ storyId, chapterId, db });
    logger.info('Step 5 (Images) completed', { 
      storyId, 
      chapterId, 
      success: step5.success,
      error: step5.error 
    });
    
    if (!step5.success) {
      return { 
        step2, 
        step3,
        step4,
        step5,
        step6: { success: false, error: 'Not attempted' },
        failedAt: 5 
      };
    }
    
    // Step 6: Generate Package
    const step6: any = await generateChapterPackageService({ storyId, chapterId, db });
    logger.info('Step 6 (Package) completed', { 
      storyId, 
      chapterId, 
      success: step6.success,
      error: step6.error 
    });
    
    logger.info('Chapter pipeline job completed successfully', { 
      storyId, 
      chapterId, 
      userId 
    });
    
    return { step2, step3, step4, step5, step6 };
    
  } catch (error) {
    logger.error('Chapter pipeline job failed', { 
      storyId, 
      chapterId, 
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  }
}

export async function closeQueues() {
  if (chapterQueue) {
    logger.info('Closing chapter queue');
    await chapterQueue.close();
    chapterQueue = null;
  }
  
  if (chapterWorker) {
    logger.info('Closing chapter worker');
    await chapterWorker.close();
    chapterWorker = null;
  }
}