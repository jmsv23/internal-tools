import { initializeQueueSystem } from '@/lib/queue';

// This module will be automatically imported by Next.js
// The queue system will be initialized when this module is loaded

console.log('Initializing BullMQ queue system for chapter pipeline...');

try {
  initializeQueueSystem();
  console.log('BullMQ queue system initialized successfully');
} catch (error) {
  console.error('Failed to initialize BullMQ queue system:', error);
}