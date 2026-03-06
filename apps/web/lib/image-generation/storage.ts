import { logger } from "@repo/logger";
import { uploadStream } from "@/lib/store/minio";

export interface ImageStorageResult {
  success: boolean;
  objectPath?: string;
  error?: string;
  errorCode?: string;
}

export interface ImageStorageInput {
  imageUrl: string;
  imageId: string;
  format?: string;
  customPath?: string;
  downloadRetries?: number;
  downloadRetryDelayMs?: number;
}

/**
 * Download image from URL and upload to MinIO storage
 * Returns the object path for storage in database
 */
export async function downloadAndStoreImage({
  imageUrl,
  imageId,
  format = "png",
  customPath,
  downloadRetries = 3,
  downloadRetryDelayMs = 3000,
}: ImageStorageInput): Promise<ImageStorageResult> {
  try {
    // Download image from RunPod URL with retry logic
    // The image URL may not be immediately available after generation
    let response: Response | null = null;
    let lastError: string = "";

    for (let attempt = 0; attempt <= downloadRetries; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, downloadRetryDelayMs));
      }

      try {
        response = await fetch(imageUrl);
        if (response.ok) break;

        lastError = `${response.status} ${response.statusText}`;
        logger.warn("Failed to download image from RunPod, retrying", {
          attempt,
          status: response.status,
          imageUrl,
        });
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : "Network error";
        logger.warn("Fetch error downloading image from RunPod, retrying", {
          attempt,
          error: lastError,
          imageUrl,
        });
      }
    }

    if (!response?.ok) {
      logger.error("Failed to download image from RunPod after all retries", {
        retries: downloadRetries,
        lastError,
        imageUrl,
      });
      return {
        success: false,
        error: `Failed to download image after ${downloadRetries} retries: ${lastError}`,
        errorCode: "DOWNLOAD_FAILED",
      };
    }

    // Get image as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create object path for MinIO
    const objectPath = customPath || `images/${imageId}.${format}`;

    // Upload to MinIO
    try {
      await uploadStream(objectPath, buffer, buffer.length, {
        contentType: `image/${format}`,
        metadata: {
          "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        }
      });

      logger.info("Image successfully stored in MinIO", {
        imageId,
        objectPath,
        size: buffer.length,
      });

      return {
        success: true,
        objectPath,
      };
    } catch (error) {
      logger.error("Error uploading to MinIO", error);
      return {
        success: false,
        error: "Failed to upload image to storage",
        errorCode: "UPLOAD_FAILED",
      };
    }
  } catch (error) {
    logger.error("Error storing image", error);
    
    return {
      success: false,
      error: "Internal error while storing image",
      errorCode: "STORAGE_ERROR",
    };
  }
}

/**
 * Generate a presigned URL for downloading an image from MinIO
 */
export async function getImageDownloadUrl(objectPath: string): Promise<string | null> {
  try {
    // Import getPresignedUrl dynamically to avoid circular dependencies
    const { getPresignedUrl } = await import("@/lib/store/minio");
    
    const url = await getPresignedUrl(objectPath, {
      expirySeconds: 60 * 60 * 24, // 24 hours
    });
    
    return url;
  } catch (error) {
    logger.error("Error generating presigned URL", error);
    return null;
  }
}