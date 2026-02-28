-- AlterTable
ALTER TABLE "audios" ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "image_generations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalPrompt" TEXT NOT NULL,
    "finalPrompt" TEXT NOT NULL,
    "styleName" TEXT,
    "negativePrompt" TEXT,
    "size" TEXT NOT NULL DEFAULT '1024*1024',
    "seed" INTEGER NOT NULL DEFAULT -1,
    "imageUrl" TEXT,
    "originalImageUrl" TEXT,
    "cost" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "generationTimeMs" INTEGER,
    "delayTimeMs" INTEGER,
    "workerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_generations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
