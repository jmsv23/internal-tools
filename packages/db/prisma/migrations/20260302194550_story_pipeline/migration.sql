-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "chapterSeed" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "conflict" TEXT NOT NULL,
    "visualDescription" TEXT NOT NULL,
    "climax" TEXT NOT NULL,
    "fullContent" TEXT,
    "ttsContent" TEXT,
    "cdtContent" TEXT,
    "storyState" TEXT,
    "contentStatus" TEXT NOT NULL DEFAULT 'pending',
    "audioUrl" TEXT,
    "audioStatus" TEXT NOT NULL DEFAULT 'pending',
    "imagePrompts" TEXT,
    "imagePromptsStatus" TEXT NOT NULL DEFAULT 'pending',
    "imagesStatus" TEXT NOT NULL DEFAULT 'pending',
    "videoConfigUrl" TEXT,
    "videoStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_images" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "imageNumber" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "duration" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chapters_storyId_chapterNumber_key" ON "chapters"("storyId", "chapterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_images_chapterId_imageNumber_key" ON "chapter_images"("chapterId", "imageNumber");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_images" ADD CONSTRAINT "chapter_images_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
