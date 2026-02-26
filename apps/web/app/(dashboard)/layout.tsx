import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
      <main>{children}</main>
    </div>
  );
}