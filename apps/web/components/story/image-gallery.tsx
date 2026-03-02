import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Download, Eye } from "lucide-react";

interface ChapterImage {
  id: string;
  imageNumber: number;
  prompt: string;
  timestamp: string;
  duration?: number;
  imageUrl?: string;
  status: string;
}

interface ImageGalleryProps {
  images: ChapterImage[];
  onDownload?: (image: ChapterImage) => void;
}

export default function ImageGallery({ images, onDownload }: ImageGalleryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "text-green-600";
      case "processing": return "text-yellow-600";
      case "failed": return "text-red-600";
      default: return "text-gray-500";
    }
  };

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">No images generated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Generated Images</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="border rounded-lg overflow-hidden">
              {image.imageUrl ? (
                <div className="aspect-video bg-muted relative">
                  <img
                    src={image.imageUrl}
                    alt={`Image ${image.imageNumber}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium">Image {image.imageNumber}</h4>
                    <p className="text-xs text-muted-foreground">
                      {image.timestamp} ({image.duration || 5}s)
                    </p>
                  </div>
                  <span className={`text-xs ${getStatusColor(image.status)}`}>
                    {image.status}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {image.prompt}
                </p>
                
                {image.imageUrl && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {onDownload && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onDownload(image)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}