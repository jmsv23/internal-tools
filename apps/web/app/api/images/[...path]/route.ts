import { NextResponse } from "next/server";
import { getImageDownloadUrl } from "@/lib/image-generation/storage";

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { path } = await params;
  
  try {
    // Join the path segments
    const objectPath = path.join("/");
    
    // Get presigned URL from MinIO
    const url = await getImageDownloadUrl(objectPath);
    
    if (!url) {
      return NextResponse.json(
        { error: "Image not found", code: "IMAGE_NOT_FOUND" },
        { status: 404 }
      );
    }
    
    // Fetch the image from MinIO and stream it to the client
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image", code: "FETCH_FAILED" },
        { status: response.status }
      );
    }
    
    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Determine content type from object path
    const contentType = objectPath.endsWith('.png') 
      ? 'image/png' 
      : objectPath.endsWith('.jpg') || objectPath.endsWith('.jpeg')
      ? 'image/jpeg'
      : objectPath.endsWith('.webp')
      ? 'image/webp'
      : 'application/octet-stream';
    
    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}