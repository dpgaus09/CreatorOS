/**
 * Batch Processing Utility
 * 
 * This utility provides a generic way to batch database operations and process them
 * asynchronously at regular intervals to reduce database load and improve performance.
 */

import { storage } from "./storage";

/**
 * Generic interface for batch operations
 */
export interface BatchOperation<T> {
  add(item: T): void;
  processNow(): Promise<void>;
  getQueueLength(): number;
  getProcessedCount(): number;
}

/**
 * Configuration options for batch processor
 */
interface BatchProcessorConfig {
  maxBatchSize: number;
  processingInterval: number;
  minItemsToProcess: number;
  name: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: BatchProcessorConfig = {
  maxBatchSize: 50,
  processingInterval: 30 * 1000, // 30 seconds
  minItemsToProcess: 10,
  name: "generic-batch"
};

/**
 * Creates a batch processor for a specific operation type
 */
export function createBatchProcessor<T>(
  processFunction: (items: T[]) => Promise<void>,
  config: Partial<BatchProcessorConfig> = {}
): BatchOperation<T> {
  // Merge with defaults
  const finalConfig: BatchProcessorConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Queue for items to be processed
  const queue: T[] = [];
  
  // Stats tracking
  let processedCount = 0;
  let lastProcessTime = 0;
  
  // Process the current batch of items
  async function processBatch() {
    if (queue.length === 0) return;
    
    // Get a batch of items to process
    const batch = queue.splice(0, finalConfig.maxBatchSize);
    
    try {
      // Process the batch
      await processFunction(batch);
      
      // Update stats
      processedCount += batch.length;
      lastProcessTime = Date.now();
      
      console.log(`[${finalConfig.name}] Processed ${batch.length} items. Total processed: ${processedCount}`);
    } catch (error) {
      console.error(`[${finalConfig.name}] Error processing batch:`, 
        error instanceof Error ? error.message : String(error));
      
      // Put the items back in the queue for retry
      queue.unshift(...batch);
    }
  }
  
  // Set up the interval timer for regular processing
  const intervalId = setInterval(async () => {
    if (queue.length >= finalConfig.minItemsToProcess) {
      await processBatch();
    }
  }, finalConfig.processingInterval);
  
  // Ensure the interval is cleaned up properly when Node.js exits
  process.on('exit', () => {
    clearInterval(intervalId);
  });
  
  // Return the public API
  return {
    add(item: T) {
      queue.push(item);
      
      // If queue gets large, process immediately
      if (queue.length >= finalConfig.maxBatchSize) {
        processBatch().catch(err => {
          console.error(`[${finalConfig.name}] Error in immediate processing:`, err);
        });
      }
    },
    
    async processNow() {
      await processBatch();
    },
    
    getQueueLength() {
      return queue.length;
    },
    
    getProcessedCount() {
      return processedCount;
    }
  };
}

/**
 * Page view batch processor
 */
export const pageViewProcessor = createBatchProcessor(
  async (pageViews) => {
    // Process all page views in the batch individually
    // (Could be optimized with bulk inserts if DB supports it)
    for (const pageView of pageViews) {
      await storage.createPageView(pageView);
    }
  },
  {
    name: "page-view-processor",
    maxBatchSize: 50,
    processingInterval: 30 * 1000,
    minItemsToProcess: 10
  }
);

/**
 * User event batch processor
 */
export const userEventProcessor = createBatchProcessor(
  async (userEvents) => {
    // Process all user events in the batch individually
    for (const userEvent of userEvents) {
      await storage.createUserEvent(userEvent);
    }
  },
  {
    name: "user-event-processor",
    maxBatchSize: 30,
    processingInterval: 30 * 1000,
    minItemsToProcess: 5
  }
);