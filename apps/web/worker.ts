#!/usr/bin/env node

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';

console.log('Current working directory:', process.cwd());
console.log('Looking for .env file at:', path.join(__dirname, '../../.env'));

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { logger } from "@repo/logger";
import { initializeQueueSystem } from "@/lib/queue";

async function startWorker() {
  try {
    logger.info('Starting chapter pipeline worker...');
    
    // Initialize the queue system (this will create the worker)
    initializeQueueSystem();
    
    logger.info('Chapter pipeline worker started successfully');
    logger.info('Worker is now listening for jobs...');
    
    // Keep the process running
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    
  } catch (error) {
    logger.error('Failed to start worker', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

async function gracefulShutdown() {
  logger.info('Shutting down worker gracefully...');
  process.exit(0);
}

// Start the worker
startWorker();