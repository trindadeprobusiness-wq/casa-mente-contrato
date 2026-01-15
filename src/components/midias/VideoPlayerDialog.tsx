import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VideoRow } from '@/hooks/useVideos';

interface VideoPlayerDialogProps {
  video: VideoRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onView?: (id: string) => void;
}

export function VideoPlayerDialog({ video, open, onOpenChange, onView }: VideoPlayerDialogProps) {
  useEffect(() => {
    if (open && video && onView) {
      onView(video.id);
    }
  }, [open, video, onView]);

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{video.titulo}</DialogTitle>
        
        <div className="relative">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Video Player */}
          <video
            src={video.video_url}
            controls
            autoPlay
            className="w-full max-h-[80vh] bg-black"
          >
            Seu navegador não suporta a reprodução de vídeos.
          </video>
        </div>

        {/* Video Info */}
        <div className="p-4 border-t">
          <h3 className="font-semibold text-lg">{video.titulo}</h3>
          {video.descricao && (
            <p className="text-sm text-muted-foreground mt-1">{video.descricao}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
