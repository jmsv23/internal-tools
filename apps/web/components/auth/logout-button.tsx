"use client";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  variant?: "default" | "ghost" | "outline";
}

export function LogoutButton({ variant = "ghost" }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Button variant={variant} onClick={handleLogout}>
      Sign out
    </Button>
  );
}
