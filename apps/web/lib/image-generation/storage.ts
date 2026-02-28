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
}

/**
 * Download image from URL and upload to MinIO storage
 * Returns the object path for storage in database
 */
export async function downloadAndStoreImage({
  imageUrl,
  imageId,
  format = "png",
}: ImageStorageInput): Promise<ImageStorageResult> {
  try {
    // Download image from RunPod URL
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Failed to download image from RunPod", {
        status: response.status,
        errorText,
        imageUrl,
      });
      
      return {
        success: false,
        error: `Failed to download image: ${response.status} ${response.statusText}`,
        errorCode: "DOWNLOAD_FAILED",
      };
    }

    // Get image as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create object path for MinIO
    const objectPath = `images/${imageId}.${format}`;

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