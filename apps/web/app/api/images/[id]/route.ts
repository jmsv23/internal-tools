import { db } from "@repo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { minioClient } from "@/lib/store/minio";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the image to delete
    const image = await db.imageGeneration.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete the image file from MinIO if it exists
    if (image.imageUrl) {
      try {
        // Extract the object key from the URL
        const url = new URL(image.imageUrl);
        const objectName = url.pathname.slice(1); // Remove leading slash
        
        await minioClient.removeObject("images", objectName);
      } catch (error) {
        console.error("Failed to delete image from storage:", error);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the image record from the database
    await db.imageGeneration.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}