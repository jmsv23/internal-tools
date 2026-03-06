import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play, Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ChapterAudioPlayerProps {
  audioPath?: string;
  title?: string;
  chapterId?: string;
  storyId?: string;
  onDownload?: () => void;
}

export default function ChapterAudioPlayer({
  audioPath,
  title = "Chapter Audio",
  chapterId,
  storyId,
  onDownload
}: ChapterAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioPath || !chapterId || !storyId) return;

    fetch(`/api/stories/${storyId}/chapters/${chapterId}/audio-url?audioPath=${encodeURIComponent(audioPath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) setSignedUrl(data.url);
      })
      .catch((err) => console.error("Failed to fetch audio signed URL:", err));
  }, [audioPath, chapterId, storyId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !signedUrl) return;

    audio.src = signedUrl;
    audio.load();

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [signedUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  if (!audioPath) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">No audio available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{title}</span>
            {onDownload && (
              <Button size="sm" variant="ghost" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio Controls */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={togglePlayPause}
              className="flex-shrink-0"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
