import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

const VideoModal = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border p-0 overflow-hidden">
        <DialogTitle className="sr-only">How Milkywayy Portal Works</DialogTitle>
        <div className="relative">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Video container */}
          <div className="aspect-video bg-secondary">
            {/* Video placeholder - replace with actual embed */}
            <div className="w-full h-full flex items-center justify-center">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0"
                title="How Milkywayy Portal Works"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Content below video */}
          <div className="p-6 space-y-4">
            <h3 className="font-heading text-xl font-bold">
              How Milkywayy Portal Works (Founder Walkthrough)
            </h3>
            <p className="text-muted-foreground text-sm">
              Watch booking + dashboard flow in under a minute.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/booking" className="flex-1">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse">
                  Book Now
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
