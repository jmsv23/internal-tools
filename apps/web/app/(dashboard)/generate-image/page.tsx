import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ImageGenerationForm from "@/components/image-generation/image-form";

export default async function ImageGenerationPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-center">
        <ImageGenerationForm />
      </div>
    </div>
  );
}