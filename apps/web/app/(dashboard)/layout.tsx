import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  // Check if user is authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If not authenticated, redirect to login
  if (!session?.user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "/dashboard";
    redirect(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center space-x-6">
            <Link href="/dashboard">
              <Button variant="ghost" className="font-semibold">
                Dashboard
              </Button>
            </Link>
            <Link href="/generate">
              <Button variant="ghost">
                Generate Audio
              </Button>
            </Link>
            <Link href="/generate-image">
              <Button variant="ghost">
                Generate Image
              </Button>
            </Link>
            <Link href="/content">
              <Button variant="ghost">
                Generate Content
              </Button>
            </Link>
            <Link href="/audios">
              <Button variant="ghost">
                My Audios
              </Button>
            </Link>
            <Link href="/images">
              <Button variant="ghost">
                My Images
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}