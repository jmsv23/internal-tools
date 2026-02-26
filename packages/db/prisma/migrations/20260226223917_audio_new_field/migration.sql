-- AlterTable
ALTER TABLE "audios" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "status" TEXT DEFAULT 'processing',
ADD COLUMN     "voiceId" TEXT;
