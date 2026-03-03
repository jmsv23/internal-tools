import { notFound } from "next/navigation";
import { auth } from "@/lib/auth"
import { db } from "@repo/db";
import { headers } from "next/dist/server/request/headers";
import StoryDetailPage from "@/components/story/story-detail";

interface PageProps {
  params: Promise<{ storyId: string }>;
}

// interface Story {
//   id: string;
//   title: string;
//   idea: string;
//   status: string;
//   createdAt: Date;
//   updatedAt: Date;
//   chapters: Chapter[];
// }

// interface Chapter {
//   id: string;
//   chapterNumber: number;
//   title: string;
//   context: string;
//   conflict: string;
//   visualDescription: string;
//   climax: string;
//   contentStatus: string;
//   audioStatus: string;
//   imagePromptsStatus: string;
//   imagesStatus: string;
//   videoStatus: string;
//   ttsContent?: string;
//   cdtContent?: string;
//   storyState?: string;
//   fullContent?: string;
//   imagePrompts?: string;
//   audioUrl?: string;
//   videoConfigUrl?: string;
//   images: any[];
// }

export default async function StoryPage({ params }: PageProps) {
  const { storyId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const story = await db.story.findFirst({
    where: {
      id: storyId,
      userId: session?.user?.id,
    },
    include: {
      chapters: {
        include: {
          images: true,
        },
        orderBy: {
          chapterNumber: "asc",
        },
      },
    },
  });

  if (!story) {
    notFound();
  }

  return (
    <StoryDetailPage story={story} />
  );
}
