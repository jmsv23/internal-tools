import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Generate Audio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Convert text to audio using AI voices
            </p>
            <Link href="/generate">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                Generate Audio
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Image</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create images from text descriptions
            </p>
            <Link href="/generate-image">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                Generate Image
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Generate content with AI assistance
            </p>
            <Link href="/content">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                Generate Content
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Audios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View and manage your generated audio files
            </p>
            <Link href="/audios">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                View Audios
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Images</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              View and manage your generated images
            </p>
            <Link href="/images">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                View Images
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Story Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create stories with AI-generated content, audio, and images
            </p>
            <Link href="/stories">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                Manage Stories
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}