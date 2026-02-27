import { db } from "@repo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AudioListPageProps {
  searchParams: {
    page?: string;
    limit?: string;
  };
}

const ITEMS_PER_PAGE = 10;

export default async function AudioListPage({ searchParams }: AudioListPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { page: pageParam, limit: limitParam } = await searchParams;

  const page = parseInt(pageParam || "1");
  const limit = parseInt(limitParam || ITEMS_PER_PAGE.toString());
  const offset = (page - 1) * limit;

  // Get user's audios with pagination
  const [audios, totalCount] = await Promise.all([
    db.audio.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    }),
    db.audio.count({
      where: {
        userId: session.user.id,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  // Generate pagination URLs
  const generatePageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    if (pageNum > 1) params.set("page", pageNum.toString());
    return `/audios?${params.toString()}`;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Audios</h1>
        <Link href="/generate">
          <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Generate New Audio
          </div>
        </Link>
      </div>

      {audios.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't generated any audios yet.</p>
            <Link href="/generate">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                Create Your First Audio
              </div>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {audios.map((audio) => (
              <Card key={audio.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {audio.title || `Audio ${audio.id.slice(0, 8)}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Content Preview</p>
                      <p className="text-sm line-clamp-3">
                        {audio.content || "No content available"}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
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
                        <p className="text-sm text-muted-foreground">Voice</p>
                        <p className="text-sm capitalize">{audio.voiceId}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {audio.createdAt.toLocaleDateString()}
                      </p>
                    </div>

                    {audio.status === "ready" && (
                      <Link href={`/audio/${audio.id}`}>
                        <div className="text-sm text-primary hover:underline">
                          View Details →
                        </div>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 && (
                <Link href={generatePageUrl(page - 1)}>
                  <div className="px-3 py-2 border rounded-md hover:bg-accent">
                    Previous
                  </div>
                </Link>
              )}

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Link key={pageNum} href={generatePageUrl(pageNum)}>
                    <div className={`px-3 py-2 border rounded-md ${
                      page === pageNum 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent"
                    }`}>
                      {pageNum}
                    </div>
                  </Link>
                );
              })}

              {page < totalPages && (
                <Link href={generatePageUrl(page + 1)}>
                  <div className="px-3 py-2 border rounded-md hover:bg-accent">
                    Next
                  </div>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
