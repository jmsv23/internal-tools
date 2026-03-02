# Story Pipeline - YouTube Content Generation System

## Context

The goal is to build a **story-driven content pipeline** that turns a story idea into a downloadable video package (audio + images + ffmpeg config) for a YouTube channel. Today, the app has independent content generation, audio (TTS), and image generation features. This plan connects them into a streamlined pipeline where each step feeds the next, minimizing manual work for continuous content production.

---

## Database Schema

**File:** `packages/db/prisma/schema.prisma`

Add 3 new models + update User relation:

```prisma
model Story {
  id           String    @id @default(cuid())
  userId       String
  title        String
  idea         String    @db.Text
  chapterSeed  String?   @db.Text  // Raw JSON of generated chapter definitions
  status       String    @default("processing") // processing, ready, failed
  errorMessage String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  chapters     Chapter[]
  @@map("stories")
}

model Chapter {
  id                   String   @id @default(cuid())
  storyId              String
  chapterNumber        Int
  title                String
  context              String   @db.Text
  conflict             String   @db.Text
  visualDescription    String   @db.Text
  climax               String   @db.Text
  // Step 2: Content
  fullContent          String?  @db.Text
  ttsContent           String?  @db.Text
  cdtContent           String?  @db.Text
  storyState           String?  @db.Text
  contentStatus        String   @default("pending")
  // Step 3: Audio
  audioUrl             String?
  audioStatus          String   @default("pending")
  // Step 4: Image prompts
  imagePrompts         String?  @db.Text  // JSON array
  imagePromptsStatus   String   @default("pending")
  // Step 5: Images
  imagesStatus         String   @default("pending")
  // Step 6: Package
  videoConfigUrl       String?
  videoStatus          String   @default("pending")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  story                Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  images               ChapterImage[]
  @@unique([storyId, chapterNumber])
  @@map("chapters")
}

model ChapterImage {
  id               String   @id @default(cuid())
  chapterId        String
  imageNumber      Int
  prompt           String   @db.Text
  timestamp        String
  duration         Float?
  imageUrl         String?
  status           String   @default("pending")
  errorMessage     String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  chapter          Chapter  @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  @@unique([chapterId, imageNumber])
  @@map("chapter_images")
}
```

Add `stories Story[]` to the existing `User` model.

---

## Pipeline Steps

```
Story Idea → [1] Chapter Seeds → [2] Chapter Content → [3] Audio → [4] Image Prompts → [5] Images → [6] ZIP Package
```

Each step has its own API endpoint and status field. A "Run All" button per chapter chains steps 2-6 sequentially.

**Audio config:** TTS narration is the only audio track (volume 1.0, loop false). No background music slot.

**Structured JSON output:** All Gemini calls use `responseMimeType: "application/json"` + `responseSchema` (same pattern as `lib/gemini/content-validation.ts`) for guaranteed valid structured output. No text parsing needed.

---

## JSON Schemas for Gemini Structured Output

All schemas use `Type` from `@google/genai` (already imported in the codebase).

### Step 1 - Chapter Seeds Schema
```typescript
const CHAPTER_SEED_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          context: { type: Type.STRING },
          conflict: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
          climax: { type: Type.STRING },
        },
        required: ["title", "context", "conflict", "visualDescription", "climax"],
      },
    },
  },
  required: ["chapters"],
};
```

### Step 2 - Chapter Content Schema
```typescript
const CHAPTER_CONTENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    cdt: {
      type: Type.ARRAY,
      description: "Character Descriptive Templates (only for Chapter 1 or new characters)",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Character name (e.g. LEO)" },
          description: { type: Type.STRING, description: "Static physical description in English" },
        },
        required: ["name", "description"],
      },
    },
    scenes: {
      type: Type.ARRAY,
      description: "Exactly 5 scenes",
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.INTEGER },
          narrative: { type: Type.STRING, description: "Full narrative + dialogue in Spanish" },
        },
        required: ["number", "narrative"],
      },
    },
    ttsContent: { type: Type.STRING, description: "Complete TTS-ready version in Spanish. Only narration and dialogue, no scene labels, no technical descriptions, natural pauses, clean emotional flow." },
    storyState: {
      type: Type.OBJECT,
      properties: {
        worldState: { type: Type.ARRAY, items: { type: Type.STRING } },
        characterState: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              emotionalState: { type: Type.STRING },
              internalShift: { type: Type.STRING },
            },
            required: ["name", "emotionalState", "internalShift"],
          },
        },
        lastEvent: { type: Type.STRING },
        openThreads: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["worldState", "characterState", "lastEvent", "openThreads"],
    },
  },
  required: ["scenes", "ttsContent", "storyState"],
};
```

### Step 4 - Image Prompts Schema
```typescript
const IMAGE_PROMPTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    imagePrompts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          timestamp: { type: Type.STRING, description: "MM:SS format" },
          duration: { type: Type.NUMBER, description: "Seconds to display" },
          prompt: { type: Type.STRING, description: "Full image prompt including style anchor" },
        },
        required: ["index", "timestamp", "duration", "prompt"],
      },
    },
  },
  required: ["imagePrompts"],
};
```

---

## Feature Tasks (16 tasks, ordered by dependency)

### Task 1: Database Schema + Migration
- Add Story, Chapter, ChapterImage models to `packages/db/prisma/schema.prisma` (see schema above)
- Add `stories Story[]` to User model
- Run `npx prisma migrate dev --name story_pipeline`
- **Files:** `packages/db/prisma/schema.prisma`

### Task 2: Types + Constants
- Define TS interfaces: `ChapterSeed`, `ChapterContent`, `ImagePromptEntry`, `SlideshowConfig`, pipeline status types
- Constants: image style anchor (`"Dreamlike cinematic impressionism, 16:9, silhouettes and shadows, heavy film grain, blurred features, soft focus. Color palette: Deep shadows, cold electric blue accents, and warm amber glows. No clear faces."`), default voice `"algenib"`, default language `"spanish"`, transition types array
- **Files:** `apps/web/lib/stories/types.ts`, `apps/web/lib/stories/constants.ts`

### Task 3: Chapter Seed Generation Service (Step 1 backend)
- Add `"chapter-seed-generator"` system prompt to `apps/web/lib/gemini/system-prompts.ts`
- Prompt instructs Gemini to generate chapter definitions (title, context, conflict, visualDescription, climax) in Spanish
- Use `responseMimeType: "application/json"` + `responseSchema` with `CHAPTER_SEED_SCHEMA` (see JSON Schemas section above)
- Implement `generateChapterSeeds(idea, chapterCount?)` in `apps/web/lib/stories/chapter-seed-generation.ts`
- **Reuse:** `lib/gemini/client.ts` (getGemini, GEMINI_MODELS)
- **Reference pattern:** `lib/gemini/content-validation.ts` for how to use JSON mode with schema

### Task 4: Stories CRUD API
- `POST /api/stories` — Create story, call seed generation, create Chapter records from structured JSON response
- `GET /api/stories` — List user stories with chapter counts + overall progress
- `GET /api/stories/[storyId]` — Full story with all chapters + their images + all statuses
- `DELETE /api/stories/[storyId]` — Cascade delete + MinIO cleanup
- **Reuse:** Auth pattern from `app/api/generate-content/route.ts`, db from `@repo/db`
- **Files:** `apps/web/app/api/stories/route.ts`, `apps/web/app/api/stories/[storyId]/route.ts`

### Task 5: Generate Chapter Content API (Step 2)
- `POST /api/stories/[storyId]/chapters/[chapterId]/generate-content`
- Loads chapter seed + previous chapter's storyState + CDTs from chapter 1 for continuity
- Uses the existing `master-mistery-writer-v2` system prompt (already in `lib/gemini/system-prompts.ts`) BUT calls Gemini directly (not via `generateContent()`) to use JSON mode with `CHAPTER_CONTENT_SCHEMA`
- The user prompt = chapter seed data + context from previous chapters
- Gemini returns structured JSON → directly store `ttsContent`, `cdtContent` (JSON.stringify the CDT array), `storyState` (JSON.stringify), `fullContent` (JSON.stringify the full response) on the Chapter record
- **No text parsing needed** — the schema guarantees the structure
- Updates `contentStatus` to "ready" or "failed"
- **Reuse:** `lib/gemini/client.ts` (getGemini, GEMINI_MODELS), existing system prompt `master-mistery-writer-v2`
- **Reference pattern:** `lib/gemini/content-validation.ts` for JSON mode usage
- **Files:** `apps/web/app/api/stories/[storyId]/chapters/[chapterId]/generate-content/route.ts`

### Task 6: Generate Chapter Audio API (Step 3)
- `POST /api/stories/[storyId]/chapters/[chapterId]/generate-audio`
- Requires `contentStatus === "ready"`
- Calls existing `generateGeminiTTSToStorage()` with: text = `chapter.ttsContent`, voice = `"algenib"`, language = `"spanish"`, audioId = chapter.id
- Stores at `stories/{storyId}/audio/{chapterId}.mp3` in MinIO
- Updates `audioUrl` and `audioStatus`
- **Reuse:** `lib/gemini/tts-generation.ts` (`generateGeminiTTSToStorage`) — no modifications needed
- **Files:** `apps/web/app/api/stories/[storyId]/chapters/[chapterId]/generate-audio/route.ts`

### Task 7: Media Analysis Service (Step 4 backend)
- Add `"media-analysis"` system prompt to `apps/web/lib/gemini/system-prompts.ts`
- Prompt instructs Gemini to generate 10-15 timed image prompts from the chapter content
- Each prompt MUST include the cinematic impressionism style anchor from constants
- Timestamps estimated at ~150 words/min reading speed
- Use `responseMimeType: "application/json"` + `responseSchema` with `IMAGE_PROMPTS_SCHEMA` (see JSON Schemas section above)
- Implement `generateImagePrompts(chapterContent)` in `apps/web/lib/stories/media-analysis.ts`
- **Reuse:** `lib/gemini/client.ts` (getGemini, GEMINI_MODELS)
- **Reference pattern:** `lib/gemini/content-validation.ts` for JSON mode

### Task 8: Generate Image Prompts API (Step 4)
- `POST /api/stories/[storyId]/chapters/[chapterId]/generate-image-prompts`
- Requires `audioStatus === "ready"` (audio timing needed as reference)
- Calls media analysis service with `chapter.ttsContent` + `chapter.fullContent`
- Stores JSON string in `chapter.imagePrompts`
- Creates `ChapterImage` records for each prompt entry (status: "pending")
- Updates `imagePromptsStatus`
- **Files:** `apps/web/app/api/stories/[storyId]/chapters/[chapterId]/generate-image-prompts/route.ts`

### Task 9: Bulk Generate Images API (Step 5)
- `POST /api/stories/[storyId]/chapters/[chapterId]/generate-images`
- Requires `imagePromptsStatus === "ready"`
- Loops through ChapterImage records with status "pending" or "failed" **sequentially**
- For each image: call `generateImage({prompt, size: "1920*1080"})` then `downloadAndStoreImage()` to save to MinIO
- Store at `stories/{storyId}/images/{chapterId}/{imageNumber}.png`
- On individual failure: mark that ChapterImage as "failed", continue to next (allows retry later)
- If all images ready → `imagesStatus = "ready"`, if any failed → `imagesStatus = "failed"`
- **Reuse:** `lib/runpod/client.ts` (`generateImage`), `lib/image-generation/storage.ts` (`downloadAndStoreImage`)
- **Reference:** See `app/api/generate-image/route.ts` for the RunPod + MinIO pattern
- **Files:** `apps/web/app/api/stories/[storyId]/chapters/[chapterId]/generate-images/route.ts`

### Task 10: Package Builder Service (Step 6 backend)
- Install `jszip` dependency in `apps/web/package.json`
- `buildSlideshowConfig()` — generates autopilot-ffmpeg JSON:
  - resolution: 1920x1080, fps: 30, quality: "low", hardware_accel: "h264_nvenc"
  - background_audio: `{file: "audio/chapter.mp3", volume: 1.0, loop: false, fade_in: 2, fade_out: 3}`
  - timeline: map ChapterImages to entries with alternating transitions (crossfade, wipe_left, slide_up, fade_out)
  - All paths relative to ZIP root
- `buildChapterPackage()` — downloads audio + images from MinIO, assembles ZIP (slideshow.json + audio/chapter.mp3 + images/1.png, images/2.png, ...), uploads ZIP to MinIO
- **Reuse:** `lib/store/minio.ts` (download, uploadStream, getPresignedUrl)
- **Reference:** `/home/jmsv23/projects/personal/autopilot-ffmpeg/autopilot-ffmpeg.sh` for the JSON schema format
- **Files:** `apps/web/lib/stories/package-builder.ts`

### Task 11: Generate Package + Download APIs (Step 6)
- `POST /api/stories/[storyId]/chapters/[chapterId]/generate-package` — calls package builder, updates `videoStatus` + `videoConfigUrl`
- `GET /api/stories/[storyId]/chapters/[chapterId]/download` — generates presigned URL for the ZIP from MinIO, streams it back with proper headers
- **Files:** 2 route files under the chapter API path

### Task 12: Full Pipeline Endpoint ("Run All")
- `POST /api/stories/[storyId]/chapters/[chapterId]/run-full-pipeline`
- Sequentially runs steps 2→3→4→5→6, stopping on any failure
- Returns final chapter state with all statuses
- This is the "one click per chapter" endpoint
- **Files:** `apps/web/app/api/stories/[storyId]/chapters/[chapterId]/run-full-pipeline/route.ts`

### Task 13: Stories List Page
- Server component at `app/(dashboard)/stories/page.tsx`
- Grid of story cards: title, creation date, chapter count, overall progress
- "New Story" button linking to `/stories/new`
- **Files:** `apps/web/app/(dashboard)/stories/page.tsx`, `apps/web/components/story/story-card.tsx`

### Task 14: New Story Page
- Client component at `app/(dashboard)/stories/new/page.tsx`
- Form: title input, story idea textarea, optional chapter count selector
- On submit: calls `POST /api/stories`, shows loading spinner, redirects to `/stories/[storyId]` on success
- **Files:** `apps/web/app/(dashboard)/stories/new/page.tsx`

### Task 15: Story Detail + Pipeline Page (main UI)
- Client component at `app/(dashboard)/stories/[storyId]/page.tsx`
- **Chapter accordion:** expandable chapters showing seed info (title, context, conflict, visual, climax) + pipeline stepper
- **Pipeline stepper per chapter:** 5 steps with status indicators (pending gray / processing spinner / ready green / failed red)
- **Action buttons:** "Generate" per step when prerequisites met, "Run All" per chapter runs full pipeline
- **Preview/edit panel:**
  - After Step 2: shows structured content (scenes, CDTs, story state parsed from JSON), TTS content is **editable** before generating audio
  - After Step 3: audio player widget
  - After Step 4: image prompts list (parsed from JSON), **editable** before generating images
  - After Step 5: image gallery grid
  - After Step 6: download ZIP button
- **Status polling:** poll GET `/api/stories/[storyId]` every 3 seconds while any step is "processing", auto-update UI
- **Components to create:**
  - `components/story/chapter-accordion.tsx` — expandable chapter with seed info
  - `components/story/pipeline-stepper.tsx` — vertical stepper with 5 steps
  - `components/story/chapter-content-preview.tsx` — shows/edits structured content sections
  - `components/story/image-prompts-editor.tsx` — editable list of image prompts
  - `components/story/image-gallery.tsx` — grid of generated images
  - `components/story/chapter-audio-player.tsx` — audio player for chapter audio

### Task 16: Navigation Updates
- Add "Stories" link to dashboard nav in `apps/web/app/(dashboard)/layout.tsx`
- Add "Story Pipeline" card to dashboard in `apps/web/app/(dashboard)/page.tsx`
- **Reference:** Follow existing dashboard card pattern

---

## Implementation Order

```
Phase 1: Tasks 1, 2              (foundation — schema + types)
Phase 2: Tasks 3, 7, 10          (services — all independent, can be parallel)
Phase 3: Tasks 4, 5, 6, 8, 9, 11 (API routes — depend on services)
Phase 4: Task 12                  (full pipeline endpoint — depends on all API routes)
Phase 5: Tasks 13, 14, 15, 16    (frontend — depends on APIs)
```

---

## Key Existing Files to Reuse (do NOT duplicate)

| File | What to reuse |
|------|--------------|
| `apps/web/lib/gemini/client.ts` | `getGemini()`, `GEMINI_MODELS`, `GENERATION_CONFIG` |
| `apps/web/lib/gemini/content-validation.ts` | **Reference pattern** for JSON mode (`responseMimeType` + `responseSchema` + `Type` import) |
| `apps/web/lib/gemini/system-prompts.ts` | Add new prompts here, `master-mistery-writer-v2` already exists for Step 2 |
| `apps/web/lib/gemini/tts-generation.ts` | `generateGeminiTTSToStorage()` — call directly for Step 3 |
| `apps/web/lib/runpod/client.ts` | `generateImage()` — call for Step 5 |
| `apps/web/lib/image-generation/storage.ts` | `downloadAndStoreImage()` — call for Step 5 |
| `apps/web/lib/store/minio.ts` | `uploadStream`, `downloadObject`, `getPresignedUrl` — use for audio, images, ZIP storage |
| `apps/web/lib/auth.ts` | `auth.api.getSession()` — same auth pattern for all new routes |
| `apps/web/app/api/generate-image/route.ts` | Reference pattern for auth + RunPod + MinIO flow |
| `apps/web/app/api/generate-audio/route.ts` | Reference pattern for auth + TTS flow |

---

## Verification

1. **Schema:** Run `npx prisma migrate dev` → verify generated client types compile
2. **Step 1:** `POST /api/stories` with a story idea → verify chapters created with seed data in DB
3. **Step 2:** Generate content for chapter 1 → verify ttsContent, cdtContent, storyState parsed correctly
4. **Step 3:** Generate audio → verify MP3 in MinIO at expected path, playable
5. **Step 4:** Generate image prompts → verify JSON array with 10-15 entries, ChapterImage records created
6. **Step 5:** Generate images → verify PNGs in MinIO at 1920x1080
7. **Step 6:** Generate package → download ZIP, verify structure (`slideshow.json` + `audio/` + `images/`), verify paths are relative, test with `autopilot-ffmpeg.sh`
8. **Full pipeline:** "Run All" on a chapter → all steps complete end-to-end
9. **Frontend:** Create story from UI → navigate pipeline → generate all → download ZIP
