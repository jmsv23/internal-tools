export const IMAGE_STYLE_ANCHOR = "Dreamlike cinematic impressionism, 16:9, silhouettes and shadows, heavy film grain, blurred features, soft focus. Color palette: Deep shadows, cold electric blue accents, and warm amber glows. No clear faces.";

export const DEFAULT_VOICE = "algenib";

export const DEFAULT_LANGUAGE = "spanish";

export const TRANSITION_TYPES = [
  "crossfade",
  "wipe_left",
  "slide_up",
  "fade_out"
] as const;

export type TransitionType = typeof TRANSITION_TYPES[number];

export const DEFAULT_PIPELINE_CONFIG = {
  resolution: "1920x1080",
  fps: 30,
  quality: "low",
  hardware_accel: "h264_nvenc",
  audio: {
    volume: 1.0,
    fade_in: 2,
    fade_out: 3
  }
};

export const CHAPTER_SEED_DEFAULT_COUNT = 5;

export const IMAGE_GENERATION_SIZE = "1920*1080";

export const IMAGE_PROMPT_MIN_COUNT = 6;
export const IMAGE_PROMPT_MAX_COUNT = 10;

export const ESTIMATED_WORDS_PER_MINUTE = 150;

export const POLLING_INTERVAL = 3000;

export const STORAGE_PATHS = {
  STORIES: "stories",
  AUDIO: "audio",
  IMAGES: "images",
  PACKAGES: "packages"
} as const;

export const FILE_EXTENSIONS = {
  AUDIO: ".mp3",
  IMAGE: ".png",
  PACKAGE: ".zip",
  CONFIG: ".json"
} as const;
