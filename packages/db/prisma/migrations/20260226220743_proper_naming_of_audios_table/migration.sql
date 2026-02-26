/*
  Warnings:

  - You are about to drop the `stories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "stories" DROP CONSTRAINT "stories_userId_fkey";

-- DropTable
DROP TABLE "stories";

-- CreateTable
CREATE TABLE "audios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audios" ADD CONSTRAINT "audios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
