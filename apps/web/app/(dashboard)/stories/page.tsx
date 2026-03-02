import { db } from "@repo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StoryCard from "@/components/story/story-card";

interface Story {
  id: string;
  title: string;
  idea: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  chapterCount: number;
  completedSteps: number;
  totalSteps: number;
  progressPercentage: number;
  chapters: any[];
}

export default async function StoriesListPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const stories = await db.story.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    }
  });

  // const response = await fetch("/api/stories", {
  //   headers: {
  //     'Cookie': (await headers()).get('cookie') || ''
  //   }
  // });
  
  // if (!response.ok) {
  //   throw new Error("Failed to fetch stories");
  // }
  
  // const data = await response.json();
  // const stories = data.stories;
  // const stories = [];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stories</h1>
        <Link href="/stories/new">
          <Button>
            New Story
          </Button>
        </Link>
      </div>

      {stories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't created any stories yet.</p>
            <Link href="/stories/new">
              <Button>
                Create Your First Story
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story: Story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
