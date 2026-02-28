import { db } from "@repo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DeleteImageButton from "@/components/image/delete-image-button";

interface ImageListPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
  }>;
}

const ITEMS_PER_PAGE = 12;

export default async function ImageListPage({ searchParams }: ImageListPageProps) {
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

  // Get user's images with pagination
  const [images, totalCount] = await Promise.all([
    db.imageGeneration.findMany({
      where: {
        userId: session.user.id,
        status: "ready", // Only show successfully generated images
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    }),
    db.imageGeneration.count({
      where: {
        userId: session.user.id,
        status: "ready",
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  // Generate pagination URLs
  const generatePageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    if (pageNum > 1) params.set("page", pageNum.toString());
    return `/images?${params.toString()}`;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Images</h1>
        <Link href="/generate-image">
          <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Generate New Image
          </div>
        </Link>
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't generated any images yet.</p>
            <Link href="/generate-image">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-block">
                Create Your First Image
              </div>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden group">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {image.imageUrl ? (
                    <Link 
                      href={image.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0"
                    >
                      <img
                        src={image.imageUrl}
                        alt={image.originalPrompt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </Link>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No image available
                    </div>
                  )}
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2" title={image.originalPrompt}>
                    {image.originalPrompt.slice(0, 50)}
                    {image.originalPrompt.length > 50 ? "..." : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Prompt</p>
                    <p className="text-sm line-clamp-2" title={image.originalPrompt}>
                      {image.originalPrompt}
                    </p>
                  </div>

                  {image.styleName && image.styleName !== "none" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Style</p>
                      <p className="text-sm capitalize">{image.styleName}</p>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Size: {image.size.replace("*", "×")}</span>
                    {image.seed !== -1 && <span>Seed: {image.seed}</span>}
                  </div>

                  {image.cost && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="text-sm">${parseFloat(image.cost.toString()).toFixed(4)}</p>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{image.createdAt.toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-end">
                    <DeleteImageButton
                      imageId={image.id}
                      prompt={image.originalPrompt}
                      variant="ghost"
                      size="sm"
                    />
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