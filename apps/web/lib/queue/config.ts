import { logger } from "@repo/logger";

// Redis connection configuration
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  retryDelay: 5000,
  retryOnFail: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  enableReadyCheck: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
};

// Job types
export const JOB_TYPES = {
  CHAPTER_PIPELINE: 'chapter-pipeline',
} as const;

// Job names
export const QUEUE_NAMES = {
  CHAPTER_PIPELINE: 'chapter-pipeline',
} as const;

// Default job options
export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 10,
  removeOnFail: 5,
  attempts: 1,
  backoff: {
    type: 'fixed',
    delay: 2000,
  },
} as const;

// Initialize Redis connection (singleton)
let redisConnection: any = null;

export function getRedisConnection() {
  if (!redisConnection) {
    logger.info('Creating new Redis connection');
    
    try {
      const Redis = require('ioredis');
      redisConnection = new Redis(REDIS_CONFIG);
      
      redisConnection.on('error', (err: Error) => {
        logger.error('Redis connection error', { error: err.message });
      });
      
      redisConnection.on('ready', () => {
        logger.info('Redis connection established');
      });
      
      redisConnection.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });
      
      redisConnection.on('end', () => {
        logger.info('Redis connection ended');
      });
      
    } catch (error) {
      logger.error('Failed to create Redis connection', { error });
      throw error;
    }
  }
  
  return redisConnection;
}

export function closeRedisConnection() {
  if (redisConnection) {
    logger.info('Closing Redis connection');
    redisConnection.disconnect();
    redisConnection = null;
  }
}