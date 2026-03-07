"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const AnnouncementBar = ({ onHeightChange }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / 50, 1);
      setScrollProgress(progress);
      onHeightChange?.(36 * (1 - progress));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onHeightChange]);

  return (
    <div 
      className="bg-secondary border-b border-border text-foreground text-center text-sm font-medium overflow-hidden transition-all duration-150"
      style={{
        height: `${36 * (1 - scrollProgress)}px`,
        opacity: 1 - scrollProgress,
        paddingTop: `${8 * (1 - scrollProgress)}px`,
        paddingBottom: `${8 * (1 - scrollProgress)}px`,
      }}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 px-4">
        <Sparkles className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">🚀 Launch Offer: Flat 50% off your first property shoot</span>
        <Sparkles className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default AnnouncementBar;
