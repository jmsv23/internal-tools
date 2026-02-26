import * as Minio from 'minio';
import type { BucketItemCopy } from 'minio';
import { logger } from '@repo/logger';
import { Readable } from 'stream';
import type { MinioConfig, MinioUploadOptions, MinioPresignedUrlOptions } from '@/lib/types';

// Define UploadedObjectInfo since it's not exported from minio main module
export interface UploadedObjectInfo {
  etag: string;
  versionId: string | null;
}

// Re-export types with shorter aliases for backward compatibility
export type UploadOptions = MinioUploadOptions;
export type PresignedUrlOptions = MinioPresignedUrlOptions;

// Load MinIO configuration from environment variables
function loadMinioConfig(): MinioConfig {
  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = parseInt(process.env.MINIO_PORT || '9200', 10);
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
  const defaultBucket = process.env.MINIO_BUCKET_NAME || 'internal-tools-dev';
  const region = process.env.MINIO_REGION || 'us-east-1';

  return {
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    defaultBucket,
    region,
  };
}

// Create MinIO client singleton
const config = loadMinioConfig();
const minioClient = new Minio.Client({
  endPoint: config.endPoint,
  port: config.port,
  useSSL: config.useSSL,
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

logger.info('MinIO client initialized', {
  endPoint: config.endPoint,
  port: config.port,
  useSSL: config.useSSL,
  defaultBucket: config.defaultBucket,
});

/**
 * Ensure a bucket exists, create it if it doesn't
 */
export async function ensureBucket(
  bucketName: string = config.defaultBucket,
  region: string = config.region || 'us-east-1'
): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, region);
      logger.info(`Bucket '${bucketName}' created successfully`, {
        bucketName,
        region,
      });
    } else {
      logger.debug(`Bucket '${bucketName}' already exists`, { bucketName });
    }
  } catch (error) {
    logger.error(`Error ensuring bucket '${bucketName}' exists`, {
      error,
      bucketName,
      region,
    });
    throw error;
  }
}

/**
 * Upload a file from local filesystem to MinIO
 */
export async function uploadFile(
  objectName: string,
  filePath: string,
  options: UploadOptions = {},
  bucketName: string = config.defaultBucket
): Promise<UploadedObjectInfo> {
  try {
    await ensureBucket(bucketName);

    const metadata = options.metadata || {};
    if (options.contentType) {
      metadata['Content-Type'] = options.contentType;
    }

    const result = await minioClient.fPutObject(
      bucketName,
      objectName,
      filePath,
      metadata
    );

    logger.info(`File uploaded successfully to MinIO`, {
      bucketName,
      objectName,
      filePath,
      etag: result.etag,
    });

    return result;
  } catch (error) {
    logger.error(`Error uploading file to MinIO`, {
      error,
      bucketName,
      objectName,
      filePath,
    });
    throw error;
  }
}

/**
 * Upload a stream to MinIO (useful for large files)
 */
export async function uploadStream(
  objectName: string,
  stream: Readable | Buffer | string,
  size: number,
  options: UploadOptions = {},
  bucketName: string = config.defaultBucket
): Promise<UploadedObjectInfo> {
  try {
    await ensureBucket(bucketName);

    const metadata = options.metadata || {};
    if (options.contentType) {
      metadata['Content-Type'] = options.contentType;
    }

    const result = await minioClient.putObject(
      bucketName,
      objectName,
      stream,
      size,
      metadata
    );

    // Add 500ms delay to ensure S3 store is ready before returning
    await new Promise(resolve => setTimeout(resolve, 500));

    logger.info(`Stream uploaded successfully to MinIO`, {
      bucketName,
      objectName,
      size,
      etag: result.etag,
    });

    return result;
  } catch (error) {
    logger.error(`Error uploading stream to MinIO`, {
      error,
      bucketName,
      objectName,
      size,
    });
    throw error;
  }
}

/**
 * Download a file from MinIO to local filesystem
 */
export async function downloadFile(
  objectName: string,
  filePath: string,
  bucketName: string = config.defaultBucket
): Promise<void> {
  try {
    await minioClient.fGetObject(bucketName, objectName, filePath);

    logger.info(`File downloaded successfully from MinIO`, {
      bucketName,
      objectName,
      filePath,
    });
  } catch (error) {
    logger.error(`Error downloading file from MinIO`, {
      error,
      bucketName,
      objectName,
      filePath,
    });
    throw error;
  }
}

/**
 * Get a readable stream for an object in MinIO
 */
export async function downloadStream(
  objectName: string,
  bucketName: string = config.defaultBucket
): Promise<NodeJS.ReadableStream> {
  try {
    const stream = await minioClient.getObject(bucketName, objectName);

    logger.info(`Stream retrieved successfully from MinIO`, {
      bucketName,
      objectName,
    });

    return stream;
  } catch (error) {
    logger.error(`Error getting stream from MinIO`, {
      error,
      bucketName,
      objectName,
    });
    throw error;
  }
}

/**
 * Get a readable stream for a specific byte range of an object in MinIO
 * Useful for HTTP range requests (e.g., video streaming with seek support)
 */
export async function downloadStreamWithRange(
  objectName: string,
  start: number,
  end: number,
  bucketName: string = config.defaultBucket
): Promise<NodeJS.ReadableStream> {
  try {
    const length = end - start + 1;
    const stream = await minioClient.getPartialObject(
      bucketName,
      objectName,
      start,
      length
    );

    logger.info(`Partial stream retrieved successfully from MinIO`, {
      bucketName,
      objectName,
      start,
      end,
      length,
    });

    return stream;
  } catch (error) {
    logger.error(`Error getting partial stream from MinIO`, {
      error,
      bucketName,
      objectName,
      start,
      end,
    });
    throw error;
  }
}

/**
 * Generate a presigned URL for temporary access to an object
 */
export async function getPresignedUrl(
  objectName: string,
  options: PresignedUrlOptions = {},
  bucketName: string = config.defaultBucket
): Promise<string> {
  try {
    const expirySeconds = options.expirySeconds || 3600; // Default 1 hour
    const url = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      expirySeconds,
      options.respHeaders
    );

    logger.info(`Presigned URL generated successfully`, {
      bucketName,
      objectName,
      expirySeconds,
    });

    return url;
  } catch (error) {
    logger.error(`Error generating presigned URL`, {
      error,
      bucketName,
      objectName,
    });
    throw error;
  }
}

/**
 * Generate a presigned URL for uploading an object (PUT operation)
 * This allows clients to upload directly to MinIO without going through the backend
 */
export async function getPresignedPutUrl(
  objectName: string,
  options: { expirySeconds?: number } = {},
  bucketName: string = config.defaultBucket
): Promise<string> {
  try {
    const expirySeconds = options.expirySeconds || 3600; // Default 1 hour

    // Validate expiry time (MinIO limit is 7 days)
    if (expirySeconds < 1 || expirySeconds > 604800) {
      throw new Error('Expiry time must be between 1 second and 7 days (604800 seconds)');
    }

    const url = await minioClient.presignedPutObject(
      bucketName,
      objectName,
      expirySeconds
    );

    logger.info(`Presigned PUT URL generated successfully`, {
      bucketName,
      objectName,
      expirySeconds,
    });

    return url;
  } catch (error) {
    logger.error(`Error generating presigned PUT URL`, {
      error,
      bucketName,
      objectName,
    });
    throw error;
  }
}

/**
 * Check if an object exists in MinIO
 */
export async function objectExists(
  objectName: string,
  bucketName: string = config.defaultBucket
): Promise<boolean> {
  try {
    await minioClient.statObject(bucketName, objectName);
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false;
    }
    logger.error(`Error checking if object exists`, {
      error,
      bucketName,
      objectName,
    });
    throw error;
  }
}

/**
 * Delete an object from MinIO
 */
export async function deleteObject(
  objectName: string,
  bucketName: string = config.defaultBucket
): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, objectName);

    logger.info(`Object deleted successfully from MinIO`, {
      bucketName,
      objectName,
    });
  } catch (error) {
    logger.error(`Error deleting object from MinIO`, {
      error,
      bucketName,
      objectName,
    });
    throw error;
  }
}

/**
 * List all buckets
 */
export async function listBuckets(): Promise<Minio.BucketItemFromList[]> {
  try {
    const buckets = await minioClient.listBuckets();
    logger.info(`Listed ${buckets.length} buckets from MinIO`);
    return buckets;
  } catch (error) {
    logger.error(`Error listing buckets from MinIO`, { error });
    throw error;
  }
}

/**
 * List objects in a bucket with optional prefix filter
 */
export async function listObjects(
  prefix: string = '',
  bucketName: string = config.defaultBucket,
  recursive: boolean = true
): Promise<Minio.BucketItem[]> {
  try {
    const objects: Minio.BucketItem[] = [];
    const stream = minioClient.listObjects(bucketName, prefix, recursive);

    for await (const obj of stream) {
      objects.push(obj);
    }

    logger.info(`Listed ${objects.length} objects from MinIO`, {
      bucketName,
      prefix,
      recursive,
    });

    return objects;
  } catch (error) {
    logger.error(`Error listing objects from MinIO`, {
      error,
      bucketName,
      prefix,
    });
    throw error;
  }
}

/**
 * Get object metadata/stats
 */
export async function getObjectStat(
  objectName: string,
  bucketName: string = config.defaultBucket
): Promise<Minio.BucketItemStat> {
  try {
    const stat = await minioClient.statObject(bucketName, objectName);
    logger.debug(`Retrieved object stats from MinIO`, {
      bucketName,
      objectName,
      size: stat.size,
    });
    return stat;
  } catch (error) {
    logger.error(`Error getting object stats from MinIO`, {
      error,
      bucketName,
      objectName,
    });
    throw error;
  }
}

/**
 * Copy an object within MinIO (same or different bucket)
 */
export async function copyObject(
  sourceObjectName: string,
  destinationObjectName: string,
  sourceBucket: string = config.defaultBucket,
  destinationBucket: string = config.defaultBucket
): Promise<BucketItemCopy> {
  try {
    await ensureBucket(destinationBucket);

    const conditions = new Minio.CopyConditions();
    const result = await minioClient.copyObject(
      destinationBucket,
      destinationObjectName,
      `/${sourceBucket}/${sourceObjectName}`,
      conditions
    );

    // Handle both CopyObjectResultV1 and CopyObjectResultV2
    const etag = 'etag' in result ? result.etag : result.Etag || '';
    const lastModified = 'lastModified' in result
      ? result.lastModified
      : result.LastModified || new Date();

    // Ensure lastModified is a Date object
    const normalizedResult: BucketItemCopy = {
      etag,
      lastModified: lastModified instanceof Date
        ? lastModified
        : new Date(lastModified)
    };

    logger.info(`Object copied successfully in MinIO`, {
      sourceBucket,
      sourceObjectName,
      destinationBucket,
      destinationObjectName,
    });

    return normalizedResult;
  } catch (error) {
    logger.error(`Error copying object in MinIO`, {
      error,
      sourceBucket,
      sourceObjectName,
      destinationBucket,
      destinationObjectName,
    });
    throw error;
  }
}

// Export the singleton client and config for advanced usage
export { minioClient, config as minioConfig };
