import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

export async function Header() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">Internal tools</span>
        </Link>

        <div className="flex items-center justify-between px-4">
          <nav className="flex items-center gap-4">
            {session ? (
              <>
                <div className="flex items-center gap-4">
                  <Link href="/generate" className="text-sm hover:text-primary">
                    Generate
                  </Link>
                  <Link href="/audios" className="text-sm hover:text-primary">
                    My Audios
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {session.user.email}
                  </span>
                  <LogoutButton />
                </div>
              </>
            ) : (
              <Button asChild variant="default" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
