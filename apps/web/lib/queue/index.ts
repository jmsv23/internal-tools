import { getChapterQueue, getChapterWorker, closeQueues } from './worker';
import { closeRedisConnection } from './config';

// Initialize queue and worker
let initialized = false;

export function initializeQueueSystem() {
  if (initialized) {
    return;
  }

  try {
    // Initialize queue and worker
    getChapterQueue();
    getChapterWorker();
    
    initialized = true;
    
    // Set up graceful shutdown
    const shutdown = async () => {
      await closeQueues();
      await closeRedisConnection();
    };

    // Handle different shutdown signals
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach((signal) => {
      process.on(signal as NodeJS.Signals, shutdown);
    });
    
  } catch (error) {
    console.error('Failed to initialize queue system:', error);
    throw error;
  }
}

// Export functions
export { getChapterQueue } from './worker';
export { getRedisConnection } from './config';
export type {
  ChapterPipelineJobData,
  ChapterPipelineJobResult,
  JobStatus,
  Job,
  Queue,
  Worker,
  JobsOptions,
} from './types';

// Auto-initialize if this is not a test environment
if (process.env.NODE_ENV !== 'test') {
  initializeQueueSystem();
}