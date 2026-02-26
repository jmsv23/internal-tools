import { db } from "@repo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AudioDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AudioDetailPage({ params }: AudioDetailPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Get the audio and verify it belongs to the current user
  const audio = await db.audio.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  });

  if (!audio) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/audios" className="text-primary hover:underline">
          ← Back to My Audios
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audio Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Audio ID</h3>
                <p className="font-mono text-sm">{audio.id}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  audio.status === "ready" 
                    ? "bg-green-100 text-green-800" 
                    : audio.status === "processing"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {audio.status || "processing"}
                </span>
              </div>

              {audio.voiceId && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Voice</h3>
                  <p className="capitalize">{audio.voiceId}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                <p>{audio.createdAt.toLocaleDateString()}</p>
              </div>

              {audio.updatedAt > audio.createdAt && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                  <p>{audio.updatedAt.toLocaleDateString()}</p>
                </div>
              )}

              {audio.duration && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                  <p>{Math.round(audio.duration)} seconds</p>
                </div>
              )}

              {audio.fileSize && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">File Size</h3>
                  <p>{(audio.fileSize / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Content</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p className="whitespace-pre-wrap">{audio.content || "No content available"}</p>
                </div>
              </div>

              {audio.audioUrl && audio.status === "ready" && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Audio</h3>
                  <audio controls className="w-full">
                    <source src={`/api/audio/${audio.id}/download`} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  
                  <div className="mt-4">
                    <a 
                      href={`/api/audio/${audio.id}/download`}
                      download
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                    >
                      Download Audio
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}