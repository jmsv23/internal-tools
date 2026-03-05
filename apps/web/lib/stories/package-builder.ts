import JSZip from "jszip";
import { logger } from "@repo/logger";
import { downloadStream, uploadStream } from "@/lib/store/minio";

export interface SlideshowConfig {
  output_file: string;
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  quality: string;
  hardware_accel: string;
  background_audio: {
    file: string;
    volume: number;
    loop: boolean;
    fade_in: number;
    fade_out: number;
  };
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  type: string;
  source: string;
  duration: number;
  scale: string;
  ken_burns?: {
    zoom_from: number;
    zoom_to: number;
    direction: string;
  };
  transition?: {
    type: string;
    duration: number;
  };
}

export interface ChapterImageData {
  id: string;
  chapterId: string;
  imageNumber: number;
  prompt: string;
  timestamp: string;
  duration: number;
  imageUrl: string;
  status: string;
}

export interface PackageBuilderOptions {
  storyId: string;
  chapterId: string;
  chapterAudioUrl?: string;
  chapterImages: ChapterImageData[];
}

export interface PackageBuilderResult {
  success: boolean;
  zipObjectPath?: string;
  error?: string;
}

/**
 * Generate autopilot-ffmpeg slideshow configuration from chapter data
 */
export function buildSlideshowConfig(
  chapterAudioUrl: string,
  images: ChapterImageData[]
): SlideshowConfig {
  // Sort images by timestamp to ensure proper timeline order
  const sortedImages = [...images].sort((a, b) => {
    const timeA = parseTimestamp(a.timestamp);
    const timeB = parseTimestamp(b.timestamp);
    return timeA - timeB;
  });

  const transitionTypes = ["crossfade", "wipe_left", "slide_up", "fade_out"];
  
  const timeline: TimelineEntry[] = [];
  sortedImages.forEach((image) => {
    const kenBurnsTime = Math.floor((image.duration || 10) * .45); // Convert to milliseconds
    const entry: TimelineEntry = {
      type: "image",
      source: `images/${image.imageNumber}.png`,
      duration: (image.duration || 10) - kenBurnsTime, // Default 10 seconds if not specified
      scale: "fit",
    };

    timeline.push(entry);

    const entryKenburns: TimelineEntry = {
      type: "image",
      source: `images/${image.imageNumber}.png`,
      duration: kenBurnsTime, // Default 10 seconds if not specified
      scale: "fit",
      ken_burns: {
        zoom_from: 1.0,
        zoom_to: 1.1,
        direction: "center"
      },
      transition: {
        type: transitionTypes[0] || "crossfade", // Use first transition type for all entries
        duration: 0.5, // 0.5 second transitions
      }
    };

    timeline.push(entryKenburns);
    
    // if (index < sortedImages.length - 1) {
    //   const transitionType = transitionTypes[index % transitionTypes.length];
    //   if (transitionType) {
    //     entry.transition = {
    //       type: transitionType,
    //       duration: 0.5, // 0.5 second transitions
    //     };
    //   }
    // }
    
    // return entry;
  });

  return {
    output_file: "chapter.mp4",
    resolution: {
      width: 1920,
      height: 1080
    },
    fps: 30,
    quality: "low",
    hardware_accel: "h264_nvenc",
    background_audio: {
      file: chapterAudioUrl,
      volume: 1.0,
      loop: false,
      fade_in: 0,
      fade_out: 0,
    },
    timeline,
  };
}

/**
 * Build and upload a complete chapter package (ZIP file with all assets)
 */
export async function buildChapterPackage(
  options: PackageBuilderOptions
): Promise<PackageBuilderResult> {
  try {
    const { storyId, chapterId, chapterAudioUrl, chapterImages } = options;

    // Validate inputs
    if (!chapterAudioUrl) {
      return {
        success: false,
        error: "Chapter audio URL is required",
      };
    }

    if (!chapterImages || chapterImages.length === 0) {
      return {
        success: false,
        error: "Chapter images are required",
      };
    }

    // Filter out images that aren't ready
    const readyImages = chapterImages.filter(img => img.status === "ready");
    if (readyImages.length === 0) {
      return {
        success: false,
        error: "No ready images to include in package",
      };
    }

    // Create new ZIP file
    const zip = new JSZip();

    // 1. Generate and add slideshow config
    const slideshowConfig = buildSlideshowConfig(
      chapterAudioUrl,
      readyImages
    );
    
    zip.file("slideshow.json", JSON.stringify(slideshowConfig, null, 2));

    // 2. Download and add audio file
    logger.info("Downloading chapter audio", { storyId, chapterId, audioUrl: chapterAudioUrl });
    
    // Extract audio filename from URL (assuming it's a MinIO path like stories/{storyId}/audio/{chapterId}.mp3)
    const audioFilename = chapterAudioUrl.split('/').pop() || `${chapterId}.mp3`;
    
    try {
      const audioStream = await downloadStream(chapterAudioUrl);
      const audioBuffer = await streamToBuffer(audioStream);
      zip.file(`audio/${audioFilename}`, audioBuffer);
      logger.info("Audio file added to package", { filename: audioFilename, size: audioBuffer.length });
    } catch (error) {
      logger.error("Failed to download audio file", { error, audioUrl: chapterAudioUrl });
      return {
        success: false,
        error: "Failed to download audio file",
      };
    }

    // 3. Download and add all image files
    for (const image of readyImages) {
      if (!image.imageUrl) {
        logger.warn("Skipping image with no URL", { imageId: image.id, imageNumber: image.imageNumber });
        continue;
      }

      try {
        logger.info("Downloading chapter image", { storyId, chapterId, imageUrl: image.imageUrl });
        const imagePath = `${image.imageUrl}`.replace('/api/images', '');
        const imageStream = await downloadStream(imagePath);
        const imageBuffer = await streamToBuffer(imageStream);
        
        // Use imageNumber as filename (1.png, 2.png, etc.)
        const imageFilename = `${image.imageNumber}.png`;
        zip.file(`images/${imageFilename}`, imageBuffer);
        
        logger.info("Image file added to package", { 
          imageId: image.id, 
          filename: imageFilename, 
          size: imageBuffer.length 
        });
      } catch (error) {
        logger.error("Failed to download image file", { error, imageUrl: image.imageUrl });
        return {
          success: false,
          error: `Failed to download image ${image.imageNumber}`,
        };
      }
    }

    // 4. Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    logger.info("ZIP package generated", { 
      storyId, 
      chapterId, 
      size: zipBuffer.length,
      files: Object.keys(zip.files).length 
    });

    // 5. Upload ZIP file to MinIO
    const zipObjectPath = `stories/${storyId}/packages/${chapterId}.zip`;
    
    try {
      await uploadStream(zipObjectPath, zipBuffer, zipBuffer.length, {
        contentType: "application/zip",
      });
      
      logger.info("ZIP package uploaded to MinIO", { 
        storyId, 
        chapterId, 
        objectPath: zipObjectPath 
      });

      return {
        success: true,
        zipObjectPath,
      };
    } catch (error) {
      logger.error("Failed to upload ZIP package to MinIO", { error, objectPath: zipObjectPath });
      return {
        success: false,
        error: "Failed to upload package to storage",
      };
    }
  } catch (error) {
    logger.error("Error building chapter package", { error, storyId: options.storyId, chapterId: options.chapterId });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error building package",
    };
  }
}

/**
 * Convert a timestamp string (MM:SS) to seconds
 */
function parseTimestamp(timestamp: string): number {
  const [minutes, seconds] = timestamp.split(':').map(Number);
  return (minutes || 0) * 60 + (seconds || 0);
}

/**
 * Convert a readable stream to a buffer
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
